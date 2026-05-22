import type { SlopAnalysis } from "@/types/workspace";

/** Common AI-slop / LinkedIn cliché patterns (multilingual). */
const SLOP_PATTERNS: { id: string; re: RegExp; weight: number }[] = [
  { id: "game_changer", re: /\bgame[- ]?changer\b/i, weight: 2 },
  { id: "in_todays_world", re: /\b(in today'?s world|dans un monde|en el mundo actual)\b/i, weight: 2 },
  { id: "lessons_numbered", re: /\b(\d+\s*(lessons?|leçons?|lecciones?)|three lessons)\b/i, weight: 2 },
  { id: "let_me_tell", re: /\b(let me tell you|laissez[- ]?moi vous dire)\b/i, weight: 1 },
  { id: "heres_the_thing", re: /\b(here'?s the thing|voici la chose)\b/i, weight: 1 },
  { id: "key_takeaway", re: /\b(key takeaway|takeaway clé|conclusion clé)\b/i, weight: 1 },
  { id: "at_end_of_day", re: /\b(at the end of the day|en fin de compte|al final del día)\b/i, weight: 2 },
  { id: "excited_to_share", re: /\b(i'?m excited to (share|announce)|je suis ravi de)\b/i, weight: 2 },
  { id: "unlock", re: /\b(unlock|débloqu|descubr)\w*/i, weight: 1 },
  { id: "the_secret", re: /\b(the secret (is|to)|le secret (est|pour))\b/i, weight: 2 },
  { id: "engagement_bait", re: /\b(agree\?|comment (yes|below)|like if|partagez si)\b/i, weight: 3 },
  { id: "generic_inspiration", re: /\b(never stop learning|keep pushing|stay hungry)\b/i, weight: 2 },
  { id: "delve", re: /\b(let's delve|plongeons|profundicemos)\b/i, weight: 2 },
  { id: "tapestry", re: /\b(tapestry of|mosaïque de)\b/i, weight: 2 },
];

export function detectSlop(text: string): SlopAnalysis {
  const combined = text.trim();
  if (!combined) {
    return {
      humanScore: 5,
      slopScore: 5,
      flags: [],
      summary: "empty",
    };
  }

  const flags: string[] = [];
  let penalty = 0;
  for (const { id, re, weight } of SLOP_PATTERNS) {
    if (re.test(combined)) {
      flags.push(id);
      penalty += weight;
    }
  }

  const wordCount = combined.split(/\s+/).filter(Boolean).length;
  if (wordCount > 0 && wordCount < 80) penalty += 0;
  if (combined.match(/\b(I|je|yo)\b/gi)?.length && wordCount > 50) {
    const iRatio = (combined.match(/\b(I|je|yo)\b/gi)?.length ?? 0) / wordCount;
    if (iRatio > 0.08) penalty += 1;
  }

  const slopScore = Math.min(10, Math.max(1, 1 + Math.floor(penalty * 1.2)));
  const humanScore = Math.min(10, Math.max(1, 11 - slopScore));

  const summary =
    flags.length === 0
      ? "clean"
      : flags.length <= 2
        ? "mild_slop"
        : "heavy_slop";

  return { humanScore, slopScore, flags, summary };
}
