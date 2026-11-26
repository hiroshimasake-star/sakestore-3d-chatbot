import { AvatarSettings, isAvatarObject } from "./navichanAvatar";
import { supabaseRequest, supabaseUrl } from "./navichanSettingsServer";

const settingsPath = "/rest/v1/navichan_settings?id=eq.1&select=avatar_mode,avatar_object";
const bucketPath = "navichan-models";
const storagePath = "/storage/v1";

function serverKey() {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key missing");
  return key;
}

async function readAvatarRow(response: Response): Promise<AvatarSettings> {
  if (!response.ok) throw new Error("Avatar settings unavailable");
  const [row] = await response.json();
  if (row?.avatar_mode === "custom" && isAvatarObject(row.avatar_object)) {
    return { mode: "custom", object: row.avatar_object };
  }
  if (row?.avatar_mode === "default" || row?.avatar_mode === "hidden") {
    return { mode: row.avatar_mode, object: null };
  }
  throw new Error("Invalid avatar settings");
}

export async function readAvatarSettings() {
  return readAvatarRow(await supabaseRequest(settingsPath, serverKey()));
}

export function avatarUrl(settings: AvatarSettings): string | null {
  if (settings.mode === "hidden") return null;
  if (settings.mode === "custom") {
    return `${supabaseUrl()}${storagePath}/object/public/${bucketPath}/${settings.object}`;
  }
  const configured = process.env.NAVICHAN_DEFAULT_AVATAR?.trim();
  if (configured === "none") return null;
  if (configured && /^\/models\/[\w.-]+\.vrm$/i.test(configured)) return configured;
  return "/models/navichan.vrm";
}

export async function signAvatarUpload(object: string) {
  const response = await supabaseRequest(
    `${storagePath}/object/upload/sign/${bucketPath}/${object}`,
    serverKey(),
    { method: "POST", body: "{}" }
  );
  if (!response.ok) throw new Error("Unable to sign avatar upload");
  const { url } = await response.json();
  const expectedPath = `/object/upload/sign/${bucketPath}/${object}`;
  if (typeof url !== "string" || !url.startsWith(expectedPath + "?token=")) {
    throw new Error("Invalid signed upload URL");
  }
  return `${supabaseUrl()}${storagePath}${url}`;
}

export async function validateUploadedAvatar(object: string) {
  const response = await supabaseRequest(
    `${storagePath}/object/public/${bucketPath}/${object}`,
    serverKey(),
    { headers: { Range: "bytes=0-11" } }
  );
  if (response.status === 400 || response.status === 404) return false;
  if (!response.ok) throw new Error("Unable to verify uploaded avatar");
  const reader = response.body?.getReader();
  if (!reader) return false;
  const header = new Uint8Array(12);
  let bytesRead = 0;
  try {
    while (bytesRead < header.length) {
      const { done, value } = await reader.read();
      if (done) return false;
      const next = value.subarray(0, header.length - bytesRead);
      header.set(next, bytesRead);
      bytesRead += next.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const glb = new DataView(header.buffer);
  return glb.getUint32(0, true) === 0x46546c67 && glb.getUint32(4, true) === 2;
}

export async function saveAvatarSettings(settings: AvatarSettings) {
  const response = await supabaseRequest(settingsPath, serverKey(), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ avatar_mode: settings.mode, avatar_object: settings.object }),
  });
  return readAvatarRow(response);
}
