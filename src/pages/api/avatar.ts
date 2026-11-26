import type { NextApiRequest, NextApiResponse } from "next";
import { avatarUrl, readAvatarSettings } from "@/lib/navichanAvatarServer";
import { supabaseUrl } from "@/lib/navichanSettingsServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  if (!supabaseUrl() || !process.env.SUPABASE_SERVER_KEY) {
    return res.status(200).json({ url: avatarUrl({ mode: "default", object: null }) });
  }
  try {
    return res.status(200).json({ url: avatarUrl(await readAvatarSettings()) });
  } catch {
    return res.status(503).json({ url: null });
  }
}
