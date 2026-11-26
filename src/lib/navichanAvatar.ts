export const avatarModes = ["default", "custom", "hidden"] as const;
export type AvatarMode = typeof avatarModes[number];
export type AvatarSettings = { mode: AvatarMode; object: string | null };

export const avatarMaxBytes = 40 * 1024 * 1024;

export function isAvatarObject(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.vrm$/.test(value);
}
