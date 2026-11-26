export type ConversationExample = { input: string; output: string };
export type ConversationSettings = {
  instructions: string;
  examples: ConversationExample[] | null;
};

export const defaultConversationSettings: ConversationSettings = {
  instructions: "",
  examples: null,
};
export const instructionLimit = 2400;
export const exampleLimit = 100;
export const exampleInputLimit = 240;
export const exampleOutputLimit = 600;
export const questionLimit = 1000;

export function parseConversationSettings(input: unknown): ConversationSettings | null {
  if (!input || typeof input !== "object") return null;
  const { instructions, examples } = input as Record<string, unknown>;
  if (typeof instructions !== "string" || instructions.length > instructionLimit) return null;
  if (examples === null) return { instructions: instructions.trim(), examples };
  if (!Array.isArray(examples) || examples.length > exampleLimit) return null;

  const parsed: ConversationExample[] = [];
  for (const row of examples) {
    if (!row || typeof row.input !== "string" || typeof row.output !== "string") return null;
    const input = row.input.trim();
    const output = row.output.trim();
    if (!input || !output || input.length > exampleInputLimit || output.length > exampleOutputLimit) return null;
    parsed.push({ input, output });
  }
  return { instructions: instructions.trim(), examples: parsed };
}
