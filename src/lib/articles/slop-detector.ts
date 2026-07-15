import { runHumanWritingChecklist } from "@/lib/articles/human-writing";
import type { SlopAnalysis } from "@/types/workspace";
import type { ContentLanguage } from "@/types/workspace";

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
  // Survey / false-consensus hook (hard + soft AI LinkedIn tells)
  { id: "survey_opener", re: /\b(je vois (beaucoup|trop) de|i see (a lot of|too many)|veo a (muchos|demasiados)|on me dit souvent|i often hear|a menudo escucho)\b/i, weight: 3 },
  { id: "soft_survey_hear", re: /\b((la |une )?phrase que (j['’]entends|j['’]entends souvent|i (often )?hear|escucho)|ce que j['’]entends souvent|what i often hear|lo que m[áa]s escucho|j['’]entends souvent|i hear (a lot|often)|oigo (mucho|seguido))\b/i, weight: 3 },
  { id: "theatrical_dig", re: /\b(quand je creuse|en creusant( un peu)?|when i dig( deeper)?|digging (a bit|deeper)|cuando indago|al indagar|cuando profundizo)\b/i, weight: 3 },
  { id: "result_antithesis", re: /\b(r[ée]sultat\s*:|result\s*:|resultado\s*:)\s*.{0,40}\b(beaucoup|lots?|many|mucho|pouvoir|peu|few|poco)\b/i, weight: 2 },
  { id: "less_more_packaging", re: /\b(moins de .{0,40},?\s*plus de|less .{0,40},?\s*more |fewer .{0,40},?\s*more |menos .{0,40},?\s*m[áa]s )\b/i, weight: 2 },
  // Symmetric qualification framework — bullets OR polished inline triad (même×2+ / same×2+ / mismo×2+)
  { id: "qualification_triad", re: /\b(m[êe]me[\s\S]{0,100}?m[êe]me|same [\w'-]{2,20}[\s\S]{0,100}?same |mism[oa][\s\S]{0,100}?mism[oa])/i, weight: 3 },
  // Soft product-tease bolt-on (common after clean thought-leadership arc)
  { id: "soft_format_teaser", re: /\b(je r[ée]fl[ée]chis [àa] lancer|i('|"|’)m (thinking of|considering) (launching|starting)|estoy pensando en lanzar|nouveau mode de rencontres|new (format|mode) of (meetings|gatherings)|un nuevo formato)\b/i, weight: 2 },
  { id: "real_lever_close", re: /\b(le vrai levier|le v[ée]ritable levier|the real lever|la verdadera palanca|la clave (es|del))\b/i, weight: 3 },
  { id: "soft_opinion_packaging", re: /\b((à mon sens|in my view|en mi opini[oó]n).{0,60}(levier|lever|palanca|cl[ée]|key is))\b/i, weight: 2 },
  { id: "corporate_unlock", re: /\b(unlock the full potential|lib[ée]rer le plein potentiel|potenciar al m[áa]ximo|empower your team|future[- ]proof)\b/i, weight: 2 },
  { id: "leverage_utilize", re: /\b(leverage|utilize|delve into|tirer parti|capitaliser sur|aprovechar al m[áa]ximo)\b/i, weight: 2 },
  { id: "next_level_bait", re: /\b(next level|niveau sup[ée]rieur|siguiente nivel)\b/i, weight: 2 },
  { id: "fast_paced_world", re: /\b(fast[- ]paced world|dynamic landscape|monde en constante [ée]volution|entorno actual en constante)\b/i, weight: 2 },
  { id: "school_opener", re: /\b(pour commencer|tout d['']abord|premi[èe]rement|first and foremost|to begin with|para empezar|en primer lugar)\b/i, weight: 2 },
  { id: "en_loft_vocab", re: /\b(testament|beacon|tapestry|pivotal|underscore|paramount|delve|our journey)\b/i, weight: 3 },
  { id: "fr_corp_calque", re: /\b(ce post traite de|je suis ravi de partager|assurez[- ]vous de)\b/i, weight: 2 },
  { id: "es_spain_in_mx_tell", re: /\b(vosotros|¡?vale!|ordenador)\b/i, weight: 2 },
  { id: "es_agendar", re: /\bagendar una (llamada|reuni[oó]n)\b/i, weight: 2 },
  { id: "sandwich_hook", re: /^(.{8,120})\n\n(.{20,200})$/m, weight: 1 },
  { id: "soft_verb_stack", re: /\b(permet(tre| d[e'])|contribuer à|favoriser|enable[sd]?|foster|facilitate|ensures that|fomentar|garantizar|permite que)\b/i, weight: 1 },
  { id: "wikipedia_moral_close", re: /\b(finalement,? tout est|at the end of the day,? it'?s all about|al final del d[ií]a,? se trata de|question d['']ex[ée]cution)\b/i, weight: 2 },
];

export function detectSlop(
  text: string,
  options: { contentLanguage?: ContentLanguage } = {},
): SlopAnalysis {
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

  const humanWriting = runHumanWritingChecklist(combined, {
    contentLanguage: options.contentLanguage ?? "fr",
  });

  for (const violation of humanWriting.violations) {
    if (!flags.includes(violation.id)) {
      flags.push(violation.id);
      if (violation.severity === "error") penalty += 2;
      else if (violation.severity === "warn") penalty += 1;
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
      : flags.length <= 2 && humanWriting.summary !== "critical"
        ? "mild_slop"
        : "heavy_slop";

  return {
    humanScore,
    slopScore,
    flags,
    summary,
    humanWriting: {
      passed: humanWriting.passed,
      score: humanWriting.score,
      summary: humanWriting.summary,
      violations: humanWriting.violations.map((v) => ({
        id: v.id,
        category: v.category,
        severity: v.severity,
      })),
      categories: humanWriting.categories,
    },
  };
}
