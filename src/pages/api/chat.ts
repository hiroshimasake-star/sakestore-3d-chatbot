import type { NextApiRequest, NextApiResponse } from "next";

import { readPublicSettings } from "@/lib/navichanSettingsServer";

type Role = "system" | "user" | "assistant";
import { buildChatMessages, ChatMessage, requestChatCompletion } from "@/lib/navichanChatServer";

// ============================
// messages 正規化
//  - UI側の system を混ぜない（衝突する）
//  - content を string 化
// ============================
function normalizeIncomingMessages(messages: any[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of messages) {
    const role = m?.role as Role;
    if (role !== "user" && role !== "assistant" && role !== "system") continue;

    // system は捨てる（こちらで固定する）
    if (role === "system") continue;

    const content = m?.content != null ? String(m.content) : "";
    if (!content.trim()) continue;

    out.push({ role, content });
  }
  return out;
}

// ============================
// Handler
// ============================
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });

  try {
    const { messages, temperature, stream, model, max_tokens } = req.body ?? {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });

    // 1) UIから来たメッセージを正規化（system除去）
    const userMessages = normalizeIncomingMessages(messages);

    const { tone, conversation } = await readPublicSettings();
    const { messages: finalMessages } = buildChatMessages(userMessages, tone, conversation);
    const upstream = await requestChatCompletion(apiKey, finalMessages, {
      model,
      temperature: typeof temperature === "number" ? temperature : 0.25,
      max_tokens: typeof max_tokens === "number" ? max_tokens : 250,
      stream: Boolean(stream),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    }

    // stream=true：SSEプロキシ
    if (Boolean(stream)) {
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      // @ts-ignore
      res.flushHeaders?.();

      if (!upstream.body) return res.status(500).json({ error: "No response body" });

      const reader = (upstream.body as any).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
      return;
    }

    // stream=false：JSON
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ content });
  } catch (e: any) {
    console.error("API /api/chat error:", e);
    return res.status(500).json({ error: e?.message ?? "server error" });
  }
}