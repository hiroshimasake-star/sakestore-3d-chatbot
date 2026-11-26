import Head from "next/head";
import { FormEvent, useEffect, useState } from "react";
import { greetingLimit, NavichanSettings, parseSettings, Tone, toneLabels } from "@/lib/navichanSettings";
import { buildUrl } from "@/utils/buildUrl";
import styles from "@/styles/navichanAdmin.module.css";

export default function Admin() {
  const [settings, setSettings] = useState<NavichanSettings | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (!saved) {
        setNotice(data.error ?? "操作に失敗しました。");
        return;
      }
      setSettings(saved);
      if (method === "PUT") setNotice("保存しました。接客画面を開き直すと、あいさつを確認できます。");
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

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settings) void request("PUT", settings);
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
          {settings && <button type="button" disabled={loading} onClick={() => void request("DELETE")}>ログアウト</button>}
        </header>
        {settings ? (
          <form onSubmit={save} className={styles.form}>
            <label>
              あいさつ
              <textarea rows={3} maxLength={greetingLimit} value={settings.greeting}
                onChange={(event) => setSettings({ ...settings, greeting: event.target.value })} />
              <small>接客画面を開いたときに表示します。空欄で非表示になります。</small>
            </label>
            <label>
              返答の口調
              <select value={settings.tone} onChange={(event) => setSettings({ ...settings, tone: event.target.value as Tone })}>
                {(Object.keys(toneLabels) as Tone[]).map((tone) => (
                  <option key={tone} value={tone}>{toneLabels[tone]}</option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button type="submit" disabled={loading}>接客設定を保存</button>
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
        <p aria-live="polite" className={styles.notice}>{loading ? "読み込み中…" : notice}</p>
      </section>
    </main>
  );
}
