import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuthConfig, hasAdminSession, unauthorized } from "@/lib/navichanAdminAuth";
import { buildChatMessages, requestChatCompletion } from "@/lib/navichanChatServer";
import { parseConversationSettings, questionLimit } from "@/lib/navichanConversationSettings";
import { parseSettings } from "@/lib/navichanSettings";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  if (req.headers["x-navichan-admin"] !== "1") return res.status(403).end();
  const auth = adminAuthConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!auth || !apiKey) return res.status(503).json({ error: "テスト会話の接続設定が未完了です。" });

  try {
    if (!await hasAdminSession(req, auth)) return res.status(401).json({ error: unauthorized });
    const { question, tone, conversation } = req.body ?? {};
    const settings = parseSettings({ greeting: "", tone });
    const draft = parseConversationSettings(conversation);
    if (!settings || !draft || typeof question !== "string" || !question.trim() || question.length > questionLimit) {
      return res.status(400).json({ error: "質問と編集中の設定をご確認ください。" });
    }

    const { messages, selectedExamples } = buildChatMessages(
      [{ role: "user", content: question.trim() }], settings.tone, draft
    );
    const result = await requestChatCompletion(apiKey, messages, {
      temperature: 0.7, max_tokens: 200, stream: false,
    });
    if (!result.ok) return res.status(502).json({ error: "AIからの返答を取得できませんでした。" });
    const data = await result.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return res.status(502).json({ error: "AIからの返答が空でした。" });
    }
    return res.status(200).json({ content, examples: selectedExamples });
  } catch {
    return res.status(503).json({ error: "テスト会話に失敗しました。時間を置いて再試行してください。" });
  }
}
