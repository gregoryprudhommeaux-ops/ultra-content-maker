/** Last lines of body (+ optional PS) — used so CTA prompts avoid repeating the same opener. */
export function extractPostEnding(
  body: string,
  ps?: string,
  maxChars = 600,
): string {
  const parts = [body?.trim(), ps?.trim()].filter(Boolean) as string[];
  const combined = parts.join("\n\n");
  if (combined.length <= maxChars) return combined;
  return combined.slice(-maxChars);
}
