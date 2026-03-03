import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

export default function handler(req, res) {
  try {
    const dir = path.join(process.cwd(), "character_personality");
    const fileName = "キャラ口調.xlsx";
    const filePath = path.join(dir, fileName);

    const dirExists = fs.existsSync(dir);
    const files = dirExists ? fs.readdirSync(dir) : [];
    const fileExists = fs.existsSync(filePath);

    let sheetName = "";
    let rowsCount = 0;
    let columns = [];
    let firstRow = null;

    if (fileExists) {
      const buf = fs.readFileSync(filePath);
      const wb = XLSX.read(buf, { type: "buffer" });
      sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      rowsCount = rows.length;
      columns = rows[0] ? Object.keys(rows[0]) : [];
      firstRow = rows[0] ?? null;
    }

    res.status(200).json({
      cwd: process.cwd(),
      dir,
      dirExists,
      files,
      filePath,
      fileExists,
      sheetName,
      rowsCount,
      columns,
      firstRow,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}