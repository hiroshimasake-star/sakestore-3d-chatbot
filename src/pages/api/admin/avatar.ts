import { randomUUID } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { adminAuthConfig, hasAdminSession, unauthorized } from "@/lib/navichanAdminAuth";
import { isAvatarObject } from "@/lib/navichanAvatar";
import {
  avatarUrl, readAvatarSettings, saveAvatarSettings, signAvatarUpload, validateUploadedAvatar,
} from "@/lib/navichanAvatarServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, POST, PUT");
    return res.status(405).end();
  }
  if (req.method !== "GET" && req.headers["x-navichan-admin"] !== "1") {
    return res.status(403).end();
  }
  const auth = adminAuthConfig();
  if (!auth) return res.status(503).json({ error: "管理画面の接続設定が未完了です。" });

  try {
    if (!await hasAdminSession(req, auth)) return res.status(401).json({ error: unauthorized });

    if (req.method === "POST") {
      const object = randomUUID() + ".vrm";
      return res.status(200).json({ object, uploadUrl: await signAvatarUpload(object) });
    }
    if (req.method === "GET") {
      const settings = await readAvatarSettings();
      return res.status(200).json({ ...settings, url: avatarUrl(settings) });
    }

    const { mode, object } = req.body ?? {};
    if (mode !== "default" && mode !== "hidden" && mode !== "custom") {
      return res.status(400).json({ error: "表示方法を選んでください。" });
    }
    if (mode === "custom" && (!isAvatarObject(object) || !await validateUploadedAvatar(object))) {
      return res.status(400).json({ error: "アップロードしたVRMを確認できませんでした。" });
    }

    const saved = await saveAvatarSettings({ mode, object: mode === "custom" ? object : null });
    return res.status(200).json({ ...saved, url: avatarUrl(saved) });
  } catch {
    return res.status(503).json({ error: "3Dキャラクターの設定に接続できませんでした。" });
  }
}
