/** Keeps Gemini usage predictable on free/low tiers. */
export const MAX_USER_MESSAGE_CHARS = 450;
export const WARN_USER_MESSAGE_CHARS = 380;

/** Last N turns only (user + assistant pairs). */
export const MAX_HISTORY_MESSAGES = 4;

/** Trim each past message when building the prompt. */
export const MAX_HISTORY_CHARS_PER_MESSAGE = 280;

export const MAX_OUTPUT_TOKENS = 768;

export function trimForHistory(text: string, max = MAX_HISTORY_CHARS_PER_MESSAGE): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function clampUserInput(text: string): string {
  return text.slice(0, MAX_USER_MESSAGE_CHARS);
}
