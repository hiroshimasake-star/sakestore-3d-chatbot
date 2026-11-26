import { ChangeEvent, useEffect, useState } from "react";
import {
  ConversationExample, ConversationSettings, exampleLimit, instructionLimit,
  parseConversationSettings, questionLimit,
} from "@/lib/navichanConversationSettings";
import { Tone, toneLabels } from "@/lib/navichanSettings";
import styles from "@/styles/navichanAdmin.module.css";
import { buildUrl } from "@/utils/buildUrl";

type Props = {
  settings: ConversationSettings;
  tone: Tone;
  onChange: (settings: ConversationSettings) => void;
  onToneChange: (tone: Tone) => void;
  disabled: boolean;
  onReadingExcel: (reading: boolean) => void;
};

type TestResult = { content: string; examples: ConversationExample[] };

export function NavichanConversationAdmin({
  settings, tone, onChange, onToneChange, disabled, onReadingExcel,
}: Props) {
  const [question, setQuestion] = useState("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [fileNotice, setFileNotice] = useState("");
  const [testError, setTestError] = useState("");
  const [testing, setTesting] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    setTestResult(null);
    setTestError("");
  }, [settings, tone, question]);

  async function importExamples(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 1024 * 1024) {
      setFileNotice(".xlsx形式のファイルを1 MiB以内で選んでください。");
      return;
    }

    setReading(true);
    onReadingExcel(true);
    setFileNotice("");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array", sheetRows: exampleLimit + 2, sheets: 0,
      });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet?.["!ref"]) throw new Error("最初のシートに会話例を入力してください。");

      const range = XLSX.utils.decode_range(sheet["!ref"]);
      if (range.e.r - range.s.r > exampleLimit) {
        throw new Error(`会話例は${exampleLimit}行まで登録できます。`);
      }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const headers = (rows.shift() ?? []).map((cell) => String(cell).trim().toLowerCase());
      const inputColumn = headers.indexOf("input");
      const outputColumn = headers.indexOf("output");
      if (inputColumn < 0 || outputColumn < 0) {
        throw new Error("最初の行に input と output の見出しを付けてください。");
      }
      const examples = rows.map((row) => ({
        input: String(row[inputColumn] ?? "").trim(),
        output: String(row[outputColumn] ?? "").trim(),
      })).filter((row) => row.input || row.output);
      if (!examples.length) throw new Error("質問と返答の例を1組以上入力してください。");

      const draft = parseConversationSettings({ ...settings, examples });
      if (!draft) throw new Error("各行の質問は240文字以内、返答は600文字以内で入力してください。");
      onChange(draft);
      setFileNotice(`${file.name} から${examples.length}件を読み込みました。保存前にテストできます。`);
    } catch (error) {
      setFileNotice(error instanceof Error && /[ぁ-んァ-ン一-龯]/.test(error.message)
        ? error.message : "Excelを読み込めませんでした。");
    } finally {
      onReadingExcel(false);
      setReading(false);
    }
  }

  async function testChat() {
    if (!question.trim() || disabled || reading || testing) return;
    setTestResult(null);
    setTestError("");
    setTesting(true);
    try {
      const response = await fetch(buildUrl("/api/admin/test-chat/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Navichan-Admin": "1" },
        body: JSON.stringify({ question, tone, conversation: settings }),
      });
      const data = await response.json();
      if (!response.ok) {
        setTestError(data.error ?? "テスト会話に失敗しました。");
        return;
      }
      setTestResult(data);
    } catch {
      setTestError("テスト会話に接続できませんでした。");
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <fieldset className={styles.startSettings} disabled={disabled || reading || testing}>
        <legend>性格・話し方</legend>
        <label>返答の基本口調
          <select value={tone} onChange={(event) => onToneChange(event.target.value as Tone)}>
            {(Object.keys(toneLabels) as Tone[]).map((option) => (
              <option key={option} value={option}>{toneLabels[option]}</option>
            ))}
          </select>
        </label>
        <label>キャラクターへの指示
          <textarea rows={6} maxLength={instructionLimit} value={settings.instructions}
            placeholder="例：ナビちゃんは酒屋の新人スタッフです。親しみやすい丁寧語を使い、好みを聞いてから商品を提案してください。"
            onChange={(event) => onChange({ ...settings, instructions: event.target.value })} />
          <small>役割、性格、語尾、返答の長さ、提案するタイミングなどを入力できます。</small>
        </label>
      </fieldset>
      <fieldset className={styles.startSettings} disabled={disabled || reading || testing}>
        <legend>会話例Excel</legend>
        <label>会話例をアップロード
          <input type="file" accept=".xlsx" onChange={(event) => void importExamples(event)} />
          <small>最初のシートに input（質問）と output（返答）を入力してください。最大100件、1 MiBまで。アップロードした内容で会話例を入れ替えます。</small>
        </label>
        <p aria-live="polite">{settings.examples === null
          ? tone === "current" ? "サケストアの標準会話例を使用" : "会話例の登録なし"
          : `会話例 ${settings.examples.length}件`}</p>
        {settings.examples !== null && (
          <button type="button" onClick={() => {
            onChange({ ...settings, examples: null });
            setFileNotice("");
          }}>標準設定に戻す</button>
        )}
        {fileNotice && <small role="status">{fileNotice}</small>}
      </fieldset>
      <fieldset className={styles.startSettings} disabled={disabled || reading || testing}>
        <legend>テスト会話</legend>
        <label>お客様の質問
          <textarea rows={2} value={question} maxLength={questionLimit}
            onChange={(event) => setQuestion(event.target.value)} />
          <small>編集中の設定で返答を試せます。</small>
        </label>
        <button type="button" disabled={!question.trim()} onClick={() => void testChat()}>
          {testing ? "返答を生成中…" : "返答を試す"}
        </button>
        {testError && <p role="alert">{testError}</p>}
        {testResult && (
          <div className={styles.chatTestResult} aria-live="polite">
            <h2>AIの返答</h2>
            <p>{testResult.content}</p>
            <h3>AIに渡した会話例</h3>
            {testResult.examples.length ? (
              <ol>
                {testResult.examples.map((example, index) => (
                  <li key={index}><strong>{example.input}</strong><p>{example.output}</p></li>
                ))}
              </ol>
            ) : <p>近い会話例はありませんでした。</p>}
          </div>
        )}
      </fieldset>
    </>
  );
}
