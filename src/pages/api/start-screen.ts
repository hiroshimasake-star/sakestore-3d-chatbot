import type { NextApiRequest, NextApiResponse } from "next";
import { readPublicStartScreen } from "@/lib/navichanSettingsServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }
  return res.status(200).json(await readPublicStartScreen());
}
