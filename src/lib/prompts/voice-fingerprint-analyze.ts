import { languageLabel, languageOnlyRule } from "@/lib/prompts/language-consistency";
import type { VoiceFingerprint } from "@/lib/persona/voice-fingerprint";
import type { ContentLanguage } from "@/types/workspace";

export function buildVoiceFingerprintAnalyzeSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const lang = languageLabel(contentLanguage);
  return `You analyze an author's LinkedIn writing voice from 3 posts they are proud of (${lang}).

${languageOnlyRule(contentLanguage)}

Return JSON only:
{
  "summary": string,
  "rhythm": string,
  "hooks": string,
  "posture": string,
  "lexicalTics": string[],
  "preserveMarkers": string[],
  "avoidList": string[]
}

Rules:
- Infer ONLY from the 3 posts — do not invent biography or industry facts not present
- summary: 2–3 sentences on how this person sounds on LinkedIn
- rhythm: sentence length, line breaks, density (uneven vs polished)
- hooks: how they open (story, claim, scene, question…)
- posture: cash / pedagogical / narrative / analytical / etc.
- lexicalTics: 3–6 recurring words, phrases, or syntactic habits
- preserveMarkers: 3–5 concrete traits a ghostwriter MUST keep (asperities, not clichés)
- avoidList: 3–5 things this author does NOT do (tone, structures, formulas)
- Be specific and operational — usable as generation constraints
- All strings in ${lang}`;
}

export function buildVoiceFingerprintAnalyzeUserPrompt(posts: string[]): string {
  return JSON.stringify(
    {
      task: "voice_fingerprint",
      posts: posts.map((p, i) => ({
        index: i + 1,
        text: p.trim().slice(0, 4000),
      })),
    },
    null,
    2,
  );
}

export function normalizeVoiceFingerprintAnalyze(
  raw: Record<string, unknown>,
  sourceLabels?: string[],
): VoiceFingerprint | null {
  const summary = String(raw.summary ?? "").trim();
  const rhythm = String(raw.rhythm ?? "").trim();
  if (summary.length < 20 && rhythm.length < 8) return null;

  const list = (key: string, max: number) =>
    Array.isArray(raw[key])
      ? (raw[key] as unknown[])
          .map((item) => String(item ?? "").trim())
          .filter((item) => item.length >= 2)
          .slice(0, max)
      : [];

  return {
    summary: summary || rhythm,
    rhythm,
    hooks: String(raw.hooks ?? "").trim(),
    posture: String(raw.posture ?? "").trim(),
    lexicalTics: list("lexicalTics", 6),
    preserveMarkers: list("preserveMarkers", 5),
    avoidList: list("avoidList", 5),
    analyzedAt: new Date().toISOString(),
    sourceLabels: sourceLabels?.filter(Boolean).slice(0, 3),
  };
}
