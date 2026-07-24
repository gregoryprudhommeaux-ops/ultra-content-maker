import type { GapAnswerValue } from "@/types/workspace";

export const VOICE_FINGERPRINT_KEY = "voice_fingerprint";

export type VoiceFingerprint = {
  rhythm: string;
  hooks: string;
  posture: string;
  lexicalTics: string[];
  preserveMarkers: string[];
  avoidList: string[];
  summary: string;
  analyzedAt: string;
  sourceLabels?: string[];
};

export function emptyVoiceFingerprint(): VoiceFingerprint {
  return {
    rhythm: "",
    hooks: "",
    posture: "",
    lexicalTics: [],
    preserveMarkers: [],
    avoidList: [],
    summary: "",
    analyzedAt: "",
  };
}

function asStringList(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length >= 2)
    .slice(0, max);
}

export function parseVoiceFingerprint(
  details: Record<string, GapAnswerValue> | null | undefined,
): VoiceFingerprint | null {
  const raw = details?.[VOICE_FINGERPRINT_KEY];
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const summary = String(o.summary ?? "").trim();
    const rhythm = String(o.rhythm ?? "").trim();
    if (!summary && !rhythm) return null;
    return {
      rhythm,
      hooks: String(o.hooks ?? "").trim(),
      posture: String(o.posture ?? "").trim(),
      lexicalTics: asStringList(o.lexicalTics),
      preserveMarkers: asStringList(o.preserveMarkers),
      avoidList: asStringList(o.avoidList),
      summary,
      analyzedAt: String(o.analyzedAt ?? "").trim(),
      sourceLabels: asStringList(o.sourceLabels, 3),
    };
  } catch {
    return null;
  }
}

export function voiceFingerprintPatch(
  fingerprint: VoiceFingerprint | null,
): Record<string, GapAnswerValue> {
  if (!fingerprint || (!fingerprint.summary.trim() && !fingerprint.rhythm.trim())) {
    return { [VOICE_FINGERPRINT_KEY]: "" };
  }
  return {
    [VOICE_FINGERPRINT_KEY]: JSON.stringify(fingerprint),
  };
}

export function buildVoiceFingerprintPromptBlock(
  details: Record<string, GapAnswerValue> | Record<string, unknown> | null | undefined,
): string {
  const asGap =
    details && typeof details === "object"
      ? (details as Record<string, GapAnswerValue>)
      : null;
  const fp = parseVoiceFingerprint(asGap);
  if (!fp) return "";

  const lines = [
    fp.summary ? `Summary: ${fp.summary}` : "",
    fp.rhythm ? `Rhythm: ${fp.rhythm}` : "",
    fp.hooks ? `Hooks: ${fp.hooks}` : "",
    fp.posture ? `Posture: ${fp.posture}` : "",
    fp.lexicalTics.length ? `Lexical tics: ${fp.lexicalTics.join(" · ")}` : "",
    fp.preserveMarkers.length
      ? `Preserve markers (must keep when rewriting): ${fp.preserveMarkers.join(" · ")}`
      : "",
    fp.avoidList.length ? `Avoid: ${fp.avoidList.join(" · ")}` : "",
  ].filter(Boolean);

  if (lines.length === 0) return "";

  return `Author voice fingerprint (from 3 proud posts — honor strictly):
${lines.map((l) => `- ${l}`).join("\n")}
- Prefer these asperities over generic correct LinkedIn prose · never invent a different persona voice.`;
}
