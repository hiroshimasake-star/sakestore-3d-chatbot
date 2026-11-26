import { defaultSettings, NavichanSettings, parseSettings } from "./navichanSettings";

const settingsPath = "/rest/v1/navichan_settings?id=eq.1";

export function supabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL?.replace(/\/+$/, "");
}

export async function supabaseRequest(
  path: string,
  key: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = supabaseUrl();
  if (!url) throw new Error("Supabase URL is missing");
  return fetch(url + path, {
    ...options,
    headers: { apikey: key, "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(2500),
  });
}

export async function readSettings(): Promise<NavichanSettings> {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key is missing");
  const response = await supabaseRequest(settingsPath + "&select=greeting,tone", key);
  if (!response.ok) throw new Error("Unable to read navichan_settings");
  const [row] = await response.json();
  const settings = parseSettings(row);
  if (!settings) throw new Error("Invalid navichan_settings row");
  return settings;
}

export async function readPublicSettings(): Promise<NavichanSettings> {
  if (!supabaseUrl() || !process.env.SUPABASE_SERVER_KEY) return defaultSettings;
  try {
    return await readSettings();
  } catch {
    console.warn("Navichan settings unavailable. Using defaults.");
    return defaultSettings;
  }
}

export async function saveSettings(settings: NavichanSettings): Promise<NavichanSettings> {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key is missing");
  const response = await supabaseRequest(settingsPath, key, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error("Unable to save navichan_settings");
  const [row] = await response.json();
  const saved = parseSettings(row);
  if (!saved) throw new Error("Missing navichan_settings row");
  return saved;
}
