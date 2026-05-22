import type { BriefNicheCheck, PostBrief } from "@/types/workspace";

const GENERIC_PHRASES = [
  /\btous les (entrepreneurs|dirigeants|professionnels)\b/i,
  /\bchaque (entreprise|leader|marque)\b/i,
  /\bsur linkedin\b/i,
  /\bdans le monde (des affaires|professionnel)\b/i,
  /\bc'est important\b/i,
  /\bje pense que\b/i,
  /\bil faut (comprendre|savoir)\b/i,
  /\bthe key is\b/i,
  /\bevery (business|leader|company)\b/i,
  /\bon linkedin\b/i,
  /\bgame[- ]?changer\b/i,
  /\ble secret\b/i,
  /\b3 (leçons|lessons|tips)\b/i,
];

const SPECIFICITY_SIGNALS =
  /(\d+%|\d+\s*(€|\$|USD|EUR|MXN|k|m\b)|\b20\d{2}\b|\b(PME|SME|B2B|SaaS|ICP|export|supply chain|agro|fintech))/i;

function countGenericHits(text: string): number {
  let n = 0;
  for (const re of GENERIC_PHRASES) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function hasSpecificity(text: string): boolean {
  return SPECIFICITY_SIGNALS.test(text);
}

/** Fast pre-LLM niche clarity heuristic for the post brief. */
export function heuristicBriefNicheCheck(brief: PostBrief): BriefNicheCheck {
  const combined = [brief.problem, brief.pointOfView, brief.proof].join(" ");
  const words = combined.split(/\s+/).filter(Boolean).length;
  const genericHits = countGenericHits(combined);
  const specific = hasSpecificity(combined);

  let score = 6;
  if (words < 25) score -= 2;
  if (words >= 40) score += 1;
  if (genericHits >= 2) score -= 2;
  if (genericHits >= 4) score -= 2;
  if (specific) score += 2;
  if (brief.problem.trim().length < 20) score -= 1;
  if (brief.pointOfView.trim().length < 20) score -= 1;

  score = Math.min(10, Math.max(1, score));
  const isTooGeneric = score <= 4 || (genericHits >= 2 && !specific);

  const suggestions: string[] = [];
  if (!specific) {
    suggestions.push("add_sector_or_metric");
  }
  if (genericHits > 0) {
    suggestions.push("remove_generic_phrases");
  }
  if (brief.problem.trim().length < 30) {
    suggestions.push("detail_problem");
  }

  const feedback = isTooGeneric
    ? "brief_too_generic"
    : score >= 7
      ? "brief_niche_ok"
      : "brief_could_be_sharper";

  return { score, isTooGeneric, feedback, suggestions };
}
