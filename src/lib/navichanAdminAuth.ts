import type { NextApiRequest } from "next";
import { supabaseRequest, supabaseUrl } from "./navichanSettingsServer";

export const adminCookie = "navichan_admin";
export const unauthorized = "管理者アカウントでログインしてください。";

export function adminAuthConfig() {
  const key = process.env.SUPABASE_AUTH_KEY;
  const adminIds = (process.env.NAVICHAN_ADMIN_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!key || !supabaseUrl() || !process.env.SUPABASE_SERVER_KEY || !adminIds.length) return null;
  return { key, adminIds };
}

export async function hasAdminSession(
  req: NextApiRequest,
  { key, adminIds }: NonNullable<ReturnType<typeof adminAuthConfig>>
) {
  const token = req.cookies[adminCookie];
  if (!token) return false;
  const auth = await supabaseRequest("/auth/v1/user", key, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (auth.status >= 500) throw new Error("Auth unavailable");
  return auth.ok && adminIds.includes((await auth.json()).id);
}
