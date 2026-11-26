export const startImageMaxBytes = 750 * 1024;
export const startImageTypes = ["image/webp", "image/png", "image/jpeg"];
export const startLabelMaxLength = 60;

export type StartScreen = {
  image: string;
  desktopImage: string;
  label: string;
};

export const defaultStartScreen: StartScreen = {
  image: "",
  desktopImage: "",
  label: "接客をはじめる",
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

export function parseStartScreen(value: unknown): StartScreen | null {
  if (!value || typeof value !== "object") return null;
  const { image, desktopImage, label } = value as Record<string, unknown>;
  if (!isStartImage(image) || !isStartImage(desktopImage) ||
      typeof label !== "string" || label.length > startLabelMaxLength) return null;
  return { image, desktopImage, label: label.trim() || defaultStartScreen.label };
}
