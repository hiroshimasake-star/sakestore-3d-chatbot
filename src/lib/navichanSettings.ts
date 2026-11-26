export const toneLabels = {
  current: "現在の口調（Excelの会話例）",
  polite: "落ち着いた丁寧語",
  friendly: "親しみやすい丁寧語",
};

export type Tone = keyof typeof toneLabels;

export type NavichanSettings = { greeting: string; tone: Tone };

export const defaultSettings: NavichanSettings = { greeting: "", tone: "current" };
export const greetingLimit = 160;

export function parseSettings(input: unknown): NavichanSettings | null {
  if (!input || typeof input !== "object") return null;
  const { greeting, tone } = input as Record<string, unknown>;
  if (
    typeof greeting !== "string" ||
    greeting.length > greetingLimit ||
    typeof tone !== "string" ||
    !Object.prototype.hasOwnProperty.call(toneLabels, tone)
  ) return null;
  return { greeting: greeting.trim(), tone: tone as Tone };
}
