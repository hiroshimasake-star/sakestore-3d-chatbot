import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Viewer } from "@/features/vrmViewer/viewer";
import { AvatarSettings, AvatarMode, avatarMaxBytes } from "@/lib/navichanAvatar";
import styles from "@/styles/navichanAdmin.module.css";
import { buildUrl } from "@/utils/buildUrl";

type SavedAvatar = AvatarSettings & { url: string | null };
type SignedUpload = { object: string; uploadUrl: string };

async function requestAvatar<T>(method: string, body?: AvatarSettings): Promise<T> {
  const response = await fetch(buildUrl("/api/admin/avatar/"), {
    method,
    headers: { "Content-Type": "application/json", "X-Navichan-Admin": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "3Dキャラクターの設定に接続できませんでした。");
  return data;
}

export function NavichanAvatarAdmin() {
  const [saved, setSaved] = useState<SavedAvatar | null>(null);
  const [mode, setMode] = useState<AvatarMode>("default");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [notice, setNotice] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    requestAvatar<SavedAvatar>("GET").then((settings) => {
      if (!active) return;
      setSaved(settings);
      setMode(settings.mode);
    }).catch((error: Error) => {
      if (active) setNotice(error.message);
    });
    return () => { active = false; };
  }, []);

  const savedCustomUrl = saved?.mode === "custom" ? saved.url : null;
  const canPreview = mode === "custom" && Boolean(file || savedCustomUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canPreview) return;
    const localUrl = file ? URL.createObjectURL(file) : null;
    const url = localUrl ?? savedCustomUrl;
    if (!url) return;
    const viewer = new Viewer();
    let active = true;
    setPreviewStatus("loading");

    void (async () => {
      try {
        viewer.setup(canvas);
        await viewer.loadVrm(url, false);
        if (active) setPreviewStatus("ready");
      } catch {
        if (active) setPreviewStatus("error");
      }
    })();
    return () => {
      active = false;
      viewer.dispose();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [canPreview, file, savedCustomUrl]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (!/\.vrm$/i.test(next.name) || next.size === 0 || next.size > avatarMaxBytes) {
      setNotice("40 MiB以内の .vrm ファイルを選んでください。");
      return;
    }
    setPreviewStatus("loading");
    setNotice("");
    setFile(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saved || busy || (mode === "custom" && (!canPreview || previewStatus !== "ready"))) return;
    setBusy(true);
    setNotice("");
    try {
      let object = mode === "custom" ? saved.object : null;
      if (mode === "custom" && file) {
        const signed = await requestAvatar<SignedUpload>("POST");
        const form = new FormData();
        form.append("cacheControl", "3600");
        form.append("", new Blob([file], { type: "application/octet-stream" }), file.name);
        const response = await fetch(signed.uploadUrl, { method: "PUT", body: form });
        if (!response.ok) throw new Error("VRMをアップロードできませんでした。");
        object = signed.object;
      }
      const updated = await requestAvatar<SavedAvatar>("PUT", { mode, object });
      setSaved(updated);
      setFile(null);
      setNotice("保存しました。接客画面を開き直すと反映されます。");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`${styles.form} ${styles.avatarForm}`} onSubmit={save}>
      <fieldset className={styles.startSettings} disabled={!saved || busy}>
        <legend>接客中の3Dキャラクター</legend>
        <label>
          表示方法
          <select value={mode} onChange={(event) => {
            setPreviewStatus("idle");
            setNotice("");
            setMode(event.target.value as AvatarMode);
          }}>
            <option value="default">標準キャラクター</option>
            <option value="custom">オリジナルのVRM</option>
            <option value="hidden">3Dなし（文字で接客）</option>
          </select>
        </label>
        {mode === "custom" && (
          <>
            <label>
              VRMファイル
              <input type="file" accept=".vrm" onChange={selectFile} />
              <small>{file?.name ?? (savedCustomUrl ? "登録済みのVRM" : "40 MiBまでの .vrm ファイル")}</small>
            </label>
            {canPreview && (
              <div className={styles.avatarPreview}>
                <canvas ref={canvasRef} aria-label="3Dキャラクターのプレビュー" />
              </div>
            )}
            {previewStatus === "loading" && <small role="status">VRMを読み込み中…</small>}
            {previewStatus === "error" && <small role="alert">VRMを表示できませんでした。ファイルとブラウザーの3D設定をご確認ください。</small>}
            {file && (
              <button type="button" onClick={() => {
                setPreviewStatus("idle");
                setFile(null);
              }}>選択したファイルを取り消す</button>
            )}
          </>
        )}
        <div className={styles.actions}>
          <button type="submit" disabled={mode === "custom" && (!canPreview || previewStatus !== "ready")}>
            3Dキャラクター設定を保存
          </button>
        </div>
      </fieldset>
      <p className={styles.notice} aria-live="polite">{busy ? "保存中…" : notice || (!saved ? "読み込み中…" : "")}</p>
    </form>
  );
}
