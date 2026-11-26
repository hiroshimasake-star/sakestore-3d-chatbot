export const startImageMaxBytes = 750 * 1024;
export const startImageTypes = ["image/webp", "image/png", "image/jpeg"];
export const startLabelMaxLength = 60;

export const badgeModes = {
  standard: "標準の名札",
  image: "画像の名札",
  hidden: "非表示",
};

export type NameBadge = {
  mode: keyof typeof badgeModes;
  image: string;
  label: string;
};

const defaultBadge: NameBadge = { mode: "standard", image: "", label: "" };

export type StartScreen = {
  image: string;
  desktopImage: string;
  label: string;
  badge: NameBadge;
};

export const defaultStartScreen: StartScreen = {
  image: "",
  desktopImage: "",
  label: "接客をはじめる",
  badge: defaultBadge,
};

function isStartImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value) return true;
  if (value.length > 4 * Math.ceil(startImageMaxBytes / 3) + 24) return false;
  const match = /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const [, type, encoded] = match;
  const size = encoded.length / 4 * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  if (size > startImageMaxBytes) return false;
  const header = atob(encoded.slice(0, 16));
  if (type === "png") return header.startsWith("\x89PNG\r\n\x1a\n");
  if (type === "jpeg") return header.startsWith("\xff\xd8\xff");
  return header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
}

function parseBadge(value: unknown): NameBadge | null {
  if (value === undefined) return defaultBadge;
  if (!value || typeof value !== "object") return null;
  const { mode, image, label } = value as Record<string, unknown>;
  if (mode !== "standard" && mode !== "image" && mode !== "hidden") return null;
  if (!isStartImage(image) || typeof label !== "string" || label.length > startLabelMaxLength) return null;
  return { mode, image, label: label.trim() };
}

export function parseStartScreen(value: unknown): StartScreen | null {
  if (!value || typeof value !== "object") return null;
  const { image, desktopImage, label, badge } = value as Record<string, unknown>;
  if (!isStartImage(image) || !isStartImage(desktopImage) ||
      typeof label !== "string" || label.length > startLabelMaxLength) return null;
  const parsedBadge = parseBadge(badge);
  if (!parsedBadge) return null;
  return { image, desktopImage, label: label.trim() || defaultStartScreen.label, badge: parsedBadge };
}
