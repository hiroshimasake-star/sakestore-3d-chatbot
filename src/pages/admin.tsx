import Head from "next/head";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { greetingLimit, NavichanSettings, parseSettings, Tone, toneLabels } from "@/lib/navichanSettings";
import { NavichanStartCard } from "@/components/navichanStartCard";
import {
  parseStartScreen, StartScreen, startImageMaxBytes, startImageTypes, startLabelMaxLength,
} from "@/lib/navichanStartScreen";
import { buildUrl } from "@/utils/buildUrl";
import styles from "@/styles/navichanAdmin.module.css";

type AdminSettings = NavichanSettings & { startScreen: StartScreen };
type ImageField = "image" | "desktopImage";

const imageFields = {
  image: "開始画像（iPhone・PC共通）",
  desktopImage: "PC専用画像（任意）",
} as const;

export default function Admin() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<"phone" | "desktop">("phone");
  const [readingImage, setReadingImage] = useState(false);
  const [notice, setNotice] = useState("");

  async function request(method: string, body?: object) {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(buildUrl("/api/admin/settings/"), {
        method,
        headers: { "Content-Type": "application/json", "X-Navichan-Admin": "1" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (method === "DELETE" && response.ok) {
        setSettings(null);
        return;
      }
      const data = await response.json();
      if (response.status === 401) {
        setSettings(null);
        if (method === "GET") return;
      }
      const saved = response.ok ? parseSettings(data) : null;
      const startScreen = parseStartScreen(data.startScreen);
      if (!saved || !startScreen) {
        setNotice(data.error ?? "操作に失敗しました。");
        return;
      }
      setSettings({ ...saved, startScreen });
      if (method === "PUT") setNotice("保存しました。接客画面を開き直すと反映されます。");
    } catch {
      setNotice("接続できませんでした。通信環境を確認して再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void request("GET"); }, []);

  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void request("POST", { email: data.get("email"), password: data.get("password") });
    form.reset();
  }

  function updateStartScreen(update: Partial<StartScreen>) {
    setSettings((current) => current && {
      ...current,
      startScreen: { ...current.startScreen, ...update },
    });
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>, field: ImageField) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!startImageTypes.includes(file.type) || file.size > startImageMaxBytes) {
      setNotice("WebP、PNG、JPEGの画像を750 KiB以内で選んでください。");
      return;
    }
    setNotice("");
    setReadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      updateStartScreen({ [field]: dataUrl });
    } catch {
      setNotice("画像を開けませんでした。別の画像を選んでください。");
    } finally {
      setReadingImage(false);
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settings && !loading && !readingImage) void request("PUT", settings);
  }

  return (
    <main className={styles.screen}>
      <Head>
        <title>ナビちゃん 接客管理</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <section className={styles.card} aria-labelledby="admin-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>サケストア</p>
            <h1 id="admin-title">ナビちゃん 接客管理</h1>
          </div>
          {settings && <button type="button" disabled={loading || readingImage} onClick={() => void request("DELETE")}>ログアウト</button>}
        </header>
        {settings ? (
          <form onSubmit={save} className={styles.form}>
            <label>
              あいさつ
              <textarea rows={3} maxLength={greetingLimit} value={settings.greeting}
                onChange={(event) => setSettings({ ...settings, greeting: event.target.value })} />
              <small>接客画面で最初の返信の先頭に表示します。空欄で非表示になります。</small>
            </label>
            <label>
              返答の口調
              <select value={settings.tone} onChange={(event) => setSettings({ ...settings, tone: event.target.value as Tone })}>
                {(Object.keys(toneLabels) as Tone[]).map((tone) => (
                  <option key={tone} value={tone}>{toneLabels[tone]}</option>
                ))}
              </select>
            </label>
            <fieldset className={styles.startSettings} disabled={loading || readingImage}>
              <legend>接客開始画面</legend>
              <small>共通画像は正方形に近い比率が目安です。WebP・PNG・JPEG、1枚750 KiBまで。</small>
              {(Object.keys(imageFields) as ImageField[]).map((field) => (
                <div className={styles.imageField} key={field}>
                  <label>{imageFields[field]}
                    <input type="file" accept={startImageTypes.join(",")}
                      onChange={(event) => void chooseImage(event, field)} />
                  </label>
                  {settings.startScreen[field] && (
                    <button type="button" onClick={() => updateStartScreen({ [field]: "" })}>画像を外す</button>
                  )}
                </div>
              ))}
              <label>読み上げ用のボタン名
                <input type="text" maxLength={startLabelMaxLength} value={settings.startScreen.label}
                  onChange={(event) => updateStartScreen({ label: event.target.value })} />
              </label>
              <div className={styles.previewControls} role="group" aria-label="表示確認">
                <button type="button" aria-pressed={preview === "phone"} onClick={() => setPreview("phone")}>iPhone表示</button>
                <button type="button" aria-pressed={preview === "desktop"} onClick={() => setPreview("desktop")}>PC表示</button>
              </div>
              <div className={preview === "phone" ? styles.phonePreview : styles.desktopPreview}>
                <NavichanStartCard settings={settings.startScreen} preview={preview} />
              </div>
            </fieldset>
            <div className={styles.actions}>
              <button type="submit" disabled={loading || readingImage}>接客設定を保存</button>
              <a href={buildUrl("/")} target="_blank" rel="noopener noreferrer">接客画面を開く ↗</a>
            </div>
          </form>
        ) : (
          <form onSubmit={login} className={styles.form}>
            <label>メールアドレス<input type="email" name="email" autoComplete="username" required /></label>
            <label>パスワード<input type="password" name="password" autoComplete="current-password" required /></label>
            <button type="submit" disabled={loading}>ログイン</button>
          </form>
        )}
        <p aria-live="polite" className={styles.notice}>{loading || readingImage ? "読み込み中…" : notice}</p>
      </section>
    </main>
  );
}
