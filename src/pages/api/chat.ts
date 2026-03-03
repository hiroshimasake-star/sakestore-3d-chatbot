import * as fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import type { NextApiRequest, NextApiResponse } from "next";

type Role = "system" | "user" | "assistant";
type ChatMsg = { role: Role; content: string };

// ============================
// Excel 読み込み（キャッシュ）
// ============================
let cachedPairs: { input: string; output: string }[] | null = null;
let cachedPath: string | null = null;
let cachedMtimeMs: number | null = null;

function resolveToneExcelPath(): string | null {
  const dir = path.join(process.cwd(), "character_personality");
  if (!fs.existsSync(dir)) {
    console.warn("[chat.ts] folder not found:", dir);
    return null;
  }

  // envで指定できるように（例: キャラ口調.xlsx）
  const envName = process.env.TONE_EXCEL_FILE?.trim();
  if (envName) {
    const p = path.join(dir, envName);
    if (fs.existsSync(p)) return p;
    console.warn("[chat.ts] TONE_EXCEL_FILE not found:", p);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".xlsx"));

  if (files.length === 0) {
    console.warn("[chat.ts] no xlsx in folder:", dir);
    return null;
  }
  return path.join(dir, files[0]);
}

function loadTonePairsFresh(filePath: string): { input: string; output: string }[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const pairs: { input: string; output: string }[] = [];
  for (const row of rows) {
    const input = row?.input != null ? String(row.input).trim() : "";
    const output = row?.output != null ? String(row.output).trim() : "";
    if (!input || !output) continue;
    pairs.push({ input, output });
  }
  return pairs;
}

function loadTonePairs(): { input: string; output: string }[] {
  const filePath = resolveToneExcelPath();
  if (!filePath) return [];

  // mtime が変わってない限りキャッシュを使う
  try {
    const stat = fs.statSync(filePath);
    const mtimeMs = stat.mtimeMs;

    const canUseCache =
      cachedPairs &&
      cachedPath === filePath &&
      cachedMtimeMs === mtimeMs;

    if (canUseCache) return cachedPairs!;

    const fresh = loadTonePairsFresh(filePath);
    cachedPairs = fresh;
    cachedPath = filePath;
    cachedMtimeMs = mtimeMs;

    // デバッグ（必要なときだけ）
    if (process.env.DEBUG_TONE_EXCEL === "1") {
      console.log("[chat.ts] tone excel:", filePath);
      console.log("[chat.ts] tone pairs:", fresh.length);
      console.log("[chat.ts] first pair:", fresh[0]);
    }

    return fresh;
  } catch (e) {
    console.warn("[chat.ts] failed to stat/read excel:", e);
    return [];
  }
}

// ============================
// 関連度スコア（安全版）
// ============================
function scorePair(query: string, input: string, output: string): number {
  const q = (query || "").trim();
  if (!q) return 0;

  const hay = input + " " + output;

  const important = [
    "甘口",
    "辛口",
    "フルーティ",
    "初心者",
    "日本酒",
    "梅酒",
    "スパークリング",
    "純米",
    "吟醸",
    "大吟醸",
    "酸味",
    "香り",
    "食中酒",
    "プレゼント",
    "ギフト",
    "飲みやすい",
    "甘い",
  ];

  let s = 0;
  for (const w of important) {
    if (q.includes(w) && hay.includes(w)) s += 3;
    else if (hay.includes(w) && q.includes(w.slice(0, 2))) s += 1;
  }

  // 2文字断片で少し拾う（安全）
  const compact = q.replace(/\s+/g, "");
  for (let i = 0; i < Math.min(18, compact.length - 1); i++) {
    const frag = compact.slice(i, i + 2);
    if (frag.length === 2 && hay.includes(frag)) s += 0.2;
  }

  return s;
}

// ============================
// few-shot 抽出
//   - 関連度上位 + 最低数を担保（0点でも足す）
// ============================
function pickRelevantFewShot(
  pairs: { input: string; output: string }[],
  query: string,
  nPairs: number
): ChatMsg[] {
  if (!pairs.length || nPairs <= 0) return [];

  const ranked = pairs
    .map((p) => ({ ...p, s: scorePair(query, p.input, p.output) }))
    .sort((a, b) => b.s - a.s);

  // まず上位
  const picked = ranked.slice(0, Math.min(nPairs, ranked.length));

  // ぜんぶ0点で偏る場合に備えて、重複なしで埋める（保険）
  if (picked.length < nPairs) {
    const used = new Set(picked.map((p) => p.input + "||" + p.output));
    for (const p of ranked) {
      const key = p.input + "||" + p.output;
      if (used.has(key)) continue;
      picked.push(p);
      used.add(key);
      if (picked.length >= nPairs) break;
    }
  }

  const msgs: ChatMsg[] = [];
  for (const p of picked) {
    msgs.push({ role: "user", content: p.input });
    msgs.push({ role: "assistant", content: p.output });
  }
  return msgs;
}

// ============================
// messages 正規化
//  - UI側の system を混ぜない（衝突する）
//  - content を string 化
// ============================
function normalizeIncomingMessages(messages: any[]): ChatMsg[] {
  const out: ChatMsg[] = [];
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

function getLastUserText(msgs: ChatMsg[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") return msgs[i].content;
  }
  return "";
}

// ============================
// Handler
// ============================
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  const defaultModel = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });

  try {
    const { messages, temperature, stream, model, max_tokens } = req.body ?? {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages must be an array" });

    // 1) UIから来たメッセージを正規化（system除去）
    const userMessages = normalizeIncomingMessages(messages);

    // 2) Excelロード
    const pairs = loadTonePairs();

    // 3) last user をもとに関連few-shot
    const lastUser = getLastUserText(userMessages);
    const fewShotPairsCount = Number(process.env.TONE_FEWSHOT_PAIRS ?? 10); // デフォ 10ペア(=20メッセージ)
    const fewShot = pickRelevantFewShot(pairs, lastUser, fewShotPairsCount);

    // 4) system（口調固定はここが要）
    const systemMessage: ChatMsg = {
      role: "system",
      content: `
あなたはサケストアECの接客AIです。
直後に与える few-shot（Excel例）の口調・テンポ・語彙・記号の使い方を最優先で踏襲し、可能な限り同じように答えてください。

【口調固定】
- 「〜だよ！」の連発は禁止（できれば使わない）
- 「〜です～」「〜ですよ～」「私も好きです～」など、Excelの柔らかい語尾を優先
- 2〜5行で短く、最後に質問は “1つだけ”

【重要】
- 入力に [happy] 等のタグが付いていても、そのタグは無視して自然な日本語で返す
- 事実が不明な点は捏造せず「確認しますね♪」など口調を維持して案内
`.trim(),
    };

    // ★ここが超重要：system → few-shot → 会話本体（systemは混ぜない）
    const finalMessages: ChatMsg[] = [systemMessage, ...fewShot, ...userMessages];

    // デバッグ（必要時だけ）
    if (process.env.DEBUG_TONE_EXCEL === "1") {
      console.log("tonePairs:", pairs.length);
      console.log("fewShot messages:", fewShot.length);
      console.log("finalMessages total:", finalMessages.length);
      console.log("lastUser:", lastUser);
      console.log("fewShot sample:", fewShot[0]);
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "ChatVRM Sakestore",
      },
      body: JSON.stringify({
        model: model ?? defaultModel,
        messages: finalMessages,
        // ★口調ブレ対策：デフォ温度を低めに
        temperature: typeof temperature === "number" ? temperature : 0.25,
        max_tokens: typeof max_tokens === "number" ? max_tokens : 250,
        stream: Boolean(stream),
      }),
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