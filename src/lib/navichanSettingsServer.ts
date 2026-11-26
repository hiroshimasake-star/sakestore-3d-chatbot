import { ConversationSettings, defaultConversationSettings, parseConversationSettings } from "./navichanConversationSettings";
import { defaultSettings, NavichanSettings, parseSettings } from "./navichanSettings";

import { defaultStartScreen, parseStartScreen, StartScreen } from "./navichanStartScreen";

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

export async function readSettings() {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key is missing");
  const response = await supabaseRequest(settingsPath + "&select=greeting,tone,conversation_settings", key);
  if (!response.ok) throw new Error("Unable to read navichan_settings");
  const [row] = await response.json();
  const settings = parseSettings(row);
  if (!settings) throw new Error("Invalid navichan_settings row");
  return { ...settings, conversation: parseConversationSettings(row.conversation_settings) ?? defaultConversationSettings };
}

export async function readPublicSettings() {
  if (!supabaseUrl() || !process.env.SUPABASE_SERVER_KEY) return { ...defaultSettings, conversation: defaultConversationSettings };
  try {
    return await readSettings();
  } catch {
    console.warn("Navichan settings unavailable. Using defaults.");
    return { ...defaultSettings, conversation: defaultConversationSettings };
  }
}

export async function readAdminSettings() {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key is missing");
  const response = await supabaseRequest(settingsPath + "&select=greeting,tone,start_screen,conversation_settings", key);
  if (!response.ok) throw new Error("Unable to read admin settings");
  const [row] = await response.json();
  const settings = parseSettings(row);
  const startScreen = parseStartScreen(row?.start_screen);
  if (!settings || !startScreen) throw new Error("Invalid admin settings");
  return { ...settings, startScreen, conversation: parseConversationSettings(row.conversation_settings) ?? defaultConversationSettings };
}

export async function readPublicStartScreen(): Promise<StartScreen> {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key || !supabaseUrl()) return defaultStartScreen;
  try {
    const response = await supabaseRequest(settingsPath + "&select=start_screen", key);
    if (!response.ok) return defaultStartScreen;
    const [row] = await response.json();
    return parseStartScreen(row?.start_screen) ?? defaultStartScreen;
  } catch {
    return defaultStartScreen;
  }
}

export async function saveSettings(
  settings: NavichanSettings,
  startScreen: StartScreen,
  conversation?: ConversationSettings
) {
  const key = process.env.SUPABASE_SERVER_KEY;
  if (!key) throw new Error("Supabase server key is missing");
  const response = await supabaseRequest(settingsPath, key, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      ...settings,
      start_screen: startScreen,
      conversation_settings: conversation,
    }),
  });
  if (!response.ok) throw new Error("Unable to save navichan_settings");
  const [row] = await response.json();
  const saved = parseSettings(row);
  const savedStartScreen = parseStartScreen(row?.start_screen);
  if (!saved || !savedStartScreen) throw new Error("Missing navichan_settings row");
  return {
    ...saved,
    startScreen: savedStartScreen,
    conversation: parseConversationSettings(row.conversation_settings) ?? defaultConversationSettings,
  };
}
