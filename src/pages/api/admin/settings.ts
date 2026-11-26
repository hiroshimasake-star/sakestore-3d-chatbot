import type { NextApiRequest, NextApiResponse } from "next";
import { parseSettings } from "@/lib/navichanSettings";
import { parseStartScreen } from "@/lib/navichanStartScreen";
import { readAdminSettings, saveSettings, supabaseRequest, supabaseUrl } from "@/lib/navichanSettingsServer";

export const config = { api: { bodyParser: { sizeLimit: "3200kb" } } };

const cookieName = "navichan_admin";
const unauthorized = "管理者アカウントでログインしてください。";

function sessionCookie(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const allowedMethods = ["GET", "POST", "PUT", "DELETE"];
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader("Allow", allowedMethods.join(", "));
    return res.status(405).end();
  }
  if (req.method !== "GET" && req.headers["x-navichan-admin"] !== "1") {
    return res.status(403).end();
  }
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", sessionCookie("", 0));
    return res.status(204).end();
  }

  const key = process.env.SUPABASE_AUTH_KEY;
  const adminIds = (process.env.NAVICHAN_ADMIN_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!key || !supabaseUrl() || !process.env.SUPABASE_SERVER_KEY || !adminIds.length) {
    return res.status(503).json({ error: "管理画面の接続設定が未完了です。" });
  }

  try {
    if (req.method === "POST") {
      const { email, password } = req.body ?? {};
      if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
        return res.status(400).json({ error: "メールアドレスとパスワードを入力してください。" });
      }
      const auth = await supabaseRequest("/auth/v1/token?grant_type=password", key, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (auth.status === 429) return res.status(429).json({ error: "しばらく待ってから再試行してください。" });
      if (auth.status >= 500) throw new Error("Auth unavailable");
      if (!auth.ok) return res.status(401).json({ error: unauthorized });
      const session = await auth.json();
      if (!adminIds.includes(session.user?.id) ||
          typeof session.access_token !== "string" ||
          !/^[\w.-]+$/.test(session.access_token) ||
          !Number.isSafeInteger(session.expires_in) || session.expires_in <= 0) {
        return res.status(401).json({ error: unauthorized });
      }
      const settings = await readAdminSettings();
      res.setHeader("Set-Cookie", sessionCookie(session.access_token, session.expires_in));
      return res.status(200).json(settings);
    }

    const token = req.cookies[cookieName];
    if (!token) return res.status(401).json({ error: unauthorized });
    const auth = await supabaseRequest("/auth/v1/user", key, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (auth.status >= 500) throw new Error("Auth unavailable");
    if (!auth.ok || !adminIds.includes((await auth.json()).id)) {
      return res.status(401).json({ error: unauthorized });
    }

    if (req.method === "GET") return res.status(200).json(await readAdminSettings());

    const settings = parseSettings(req.body);
    const startScreen = parseStartScreen(req.body?.startScreen);
    if (!settings || !startScreen) {
      return res.status(400).json({ error: "あいさつ・口調・開始画面の入力内容をご確認ください。" });
    }
    return res.status(200).json(await saveSettings(settings, startScreen));
  } catch {
    return res.status(503).json({ error: "管理画面の接続に失敗しました。時間を置いて再試行してください。" });
  }
}
