import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

type Row = { input: string; output: string };

export function loadToneExamples(limit = 12): ChatMsg[] {
  const dir = path.join(process.cwd(), "character_personality");
  const filePath = path.join(dir, "キャラ口調.xlsx");

  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Row[];

  const fewShot: ChatMsg[] = [];
  for (const r of rows.slice(0, limit)) {
    const q = String(r.input || "").trim();
    const a = String(r.output || "").trim();
    if (!q || !a) continue;

    fewShot.push({ role: "user", content: q });
    fewShot.push({ role: "assistant", content: a });
  }
  return fewShot;
}