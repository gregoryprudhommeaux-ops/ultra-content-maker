/**
 * Signature / identity PS is user-opt-in in the editor — never LLM-invented.
 * Generation must leave `ps` empty; revise/humanize must not invent a bio line.
 */
export const NO_LLM_SIGNATURE_PS_RULE = `- Do NOT write a bio/identity PS (who / where / what, founder title, product one-liner). Leave "ps" as an empty string. The user may append a signature PS later as an optional step.`;

export function looksLikeIdentitySignaturePs(ps: string | undefined | null): boolean {
  const text = ps?.trim() ?? "";
  if (!text) return false;
  // Typical UCM / Charles identity closers
  if (/^ps\s*[:：]/i.test(text)) return true;
  if (
    /\b(fondateur|founder|co-?founder|ceo|pdg|bas[ée] entre|based (in|between)|guadalajara|la mesa)\b/i.test(
      text,
    ) &&
    text.length < 280
  ) {
    return true;
  }
  return false;
}

/** Drop LLM bio/signature PS; keep rare content footnotes that are not identity cards. */
export function stripGeneratedSignaturePs(
  ps: string | undefined | null,
): string | undefined {
  if (!ps?.trim()) return undefined;
  if (looksLikeIdentitySignaturePs(ps)) return undefined;
  return ps.trim();
}

export function buildDefaultSignaturePs(input: {
  contentLanguage: "fr" | "en" | "es";
  displayName?: string;
  roleTitle?: string;
  positioningLine?: string;
  savedSignaturePs?: string;
}): string {
  const saved = input.savedSignaturePs?.trim();
  if (saved) return saved;

  const name = input.displayName?.trim();
  const role = input.roleTitle?.trim();
  const positioning = input.positioningLine?.trim();
  const who = [name, role].filter(Boolean).join(", ");
  const bits = [who, positioning].filter(Boolean);
  if (bits.length === 0) return "";

  const body = bits.join(". ");
  if (input.contentLanguage === "fr") return `PS : ${body}`;
  if (input.contentLanguage === "es") return `PD: ${body}`;
  return `PS: ${body}`;
}
