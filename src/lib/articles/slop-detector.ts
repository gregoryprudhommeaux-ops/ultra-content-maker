import { runHumanWritingChecklist } from "@/lib/articles/human-writing";
import type { ContentLanguage, ProductFrame, SlopAnalysis } from "@/types/workspace";

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
  { id: "engagement_bait", re: /\b(agree\?|comment (yes|below)|like if|partagez si|comenta y agr[eé]game|d[eé]jame un comentario|comment and (connect|follow|add)|agr[eé]game si|like and comment)\b/i, weight: 3 },
  { id: "follower_proof_bait", re: /\b((los que|quienes) me siguen.{0,40}(dar fe|atestiguar|confirmar)|those who follow me.{0,40}(vouch|attest)|ceux qui me suivent.{0,40}(t[eé]moign|confirmer))\b/i, weight: 3 },
  { id: "funnel_dump_teaser", re: /\b(lista de espera.{0,100}perfil.{0,100}invitaci[oó]n|waitlist.{0,100}profile.{0,100}invitation|liste d['']attente.{0,100}profil.{0,100}invitation)/i, weight: 3 },
  { id: "network_moral_close", re: /\b((buena|una buena) red no se mide|good network (isn'?t|is not) measured|un bon r[eé]seau ne se mesure|calidad de las oportunidades que genera)\b/i, weight: 3 },
  { id: "wip_soft_spine", re: /\b(estoy perfeccionando|i('|'|')m (perfecting|refining|working on) (a |an )?(simple )?format|je (suis en train de )?perfectionn|lo que realmente me interesa|what (i |really )?(care about|matters to me) is)\b/i, weight: 2 },
  { id: "obsolete_business_card_metaphor", re: /\b(tarjetas? de visita|colecci[oó]n de tarjetas|intercambio de tarjetas|cartes? de visite|pile de cartes|business cards?|collect(ing)? (business )?cards)\b/i, weight: 3 },
  { id: "generic_inspiration", re: /\b(never stop learning|keep pushing|stay hungry)\b/i, weight: 2 },
  { id: "delve", re: /\b(let's delve|plongeons|profundicemos)\b/i, weight: 2 },
  { id: "tapestry", re: /\b(tapestry of|mosaïque de)\b/i, weight: 2 },
  // Survey / false-consensus hook (hard + soft AI LinkedIn tells)
  { id: "survey_opener", re: /\b(je vois (beaucoup|trop) de|i see (a lot of|too many)|veo a (muchos|demasiados)|on me dit souvent|i often hear|a menudo escucho)\b/i, weight: 3 },
  { id: "soft_survey_hear", re: /\b((la |une )?phrase que (j['’]entends|j['’]entends souvent|i (often )?hear|escucho)|ce que j['’]entends souvent|what i often hear|lo que m[áa]s escucho|j['’]entends souvent|i hear (a lot|often)|oigo (mucho|seguido))\b/i, weight: 3 },
  { id: "theatrical_dig", re: /\b(quand je creuse|en creusant( un peu)?|when i dig( deeper)?|digging (a bit|deeper)|cuando indago|al indagar|cuando profundizo)\b/i, weight: 3 },
  { id: "result_antithesis", re: /\b(r[ée]sultat\s*:|result\s*:|resultado\s*:)\s*.{0,40}\b(beaucoup|lots?|many|mucho|pouvoir|peu|few|poco)\b/i, weight: 2 },
  { id: "less_more_packaging", re: /\b(moins de .{0,40},?\s*plus de|less .{0,40},?\s*more |fewer .{0,40},?\s*more |menos .{0,40},?\s*m[áa]s )\b/i, weight: 2 },
  // Antithesis packaging — "Ce n'est pas X, c'est Y" (high LinkedIn AI tell · hard ban)
  { id: "not_x_its_y", re: /\b(ce n['’]est pas|il ne s['’]agit pas|it['’]?s not(?: about| just| only)?|it is not(?: about| just| only)?|no es(?: solo| sólo)?|no se trata de)\b[^.!?\n]{0,100}\b(c['’]est|mais de|it['’]?s|it is|es|sino (?:de|que))\b/i, weight: 3 },
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
  // Classic LinkedIn legitimacy / intimacy / teaser tells (2026-07-24)
  { id: "years_legitimation", re: /\b(j['']ai pass[ée] \d+[\s-]?(ans|ann[ée]es)|apr[eè]s \d+[\s-]?(ans|ann[ée]es) (dans|en|à)|after \d+[\s-]?years? (in|of|as)|despu[eé]s de \d+[\s-]?a[nñ]os (en|de))\b/i, weight: 2 },
  { id: "fake_scoop", re: /\b(personne ne (en )?parle|ce dont (on|personne) (ne )?parle|nobody (talks?|is talking) about|what nobody (tells|talks)|nadie (habla|est[aá] hablando) (de )?esto|de lo que nadie habla)\b/i, weight: 3 },
  { id: "closed_rhetorical_cta", re: /\b(tu veux (vraiment|encore) (laisser|rater|passer)|allez[- ]vous (vraiment )?laisser|are you (really )?(going to |gonna )?(let|miss|pass)|ready to (take|transform|level)|de verdad vas a (dejar|perder)|vas a dejar pasar)\b/i, weight: 3 },
  { id: "fake_we_intimacy", re: /\b(on a tous (v[ée]cu|connu|senti)|nous avons tous|we(''|’)ve all (been|felt|lived)|todos hemos (vivido|sentido|conocido)|quién no ha)\b/i, weight: 3 },
  { id: "round_follower_milestone", re: /\b(\d{1,3}([ \u00a0.]?\d{3})+\s*(abonn[ée]s|followers?|seguidores).{0,40}(ce que j['']ai appris|what i (learned|learnt)|lo que (aprend[ií]|he aprendido))|(ce que|what|lo que).{0,20}(appris|learned|aprend).{0,40}\d{1,3}([ \u00a0.]?\d{3})+\s*(abonn|follower|seguidor))\b/i, weight: 3 },
  { id: "simple_yet_powerful", re: /\b(simple (mais|et) puissant|simple yet powerful|simple but powerful|simple pero poderos[oa]|sencillo pero poderos[oa])\b/i, weight: 3 },
  { id: "vague_coming_soon_cta", re: /\b(je pr[ée]pare quelque chose|reste[rz]? [àa] l[''][ée]coute|something is coming|stay tuned|big (things?|news) (are |is )?coming|estoy preparando algo|mantente? (atento|al tanto)|pr[oó]ximamente algo)\b/i, weight: 3 },
  { id: "false_humility", re: /\b(je (ne )?suis pas (un |une )?(expert|sp[ée]cialiste)|i(''|’)m not (an? )?(expert|specialist)|no soy (un |una )?(experto|especialista)),?\s*(mais|but|pero)\b/i, weight: 3 },
];

/** Detect 3+ consecutive lines/sentences starting with the same opener word (Quand/Si/When/If…). */
export function detectAnaphoraStack(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 8);
  if (lines.length < 3) return false;
  let streak = 1;
  let prev = firstToken(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const tok = firstToken(lines[i]);
    if (tok && prev && tok === prev) {
      streak++;
      if (streak >= 3) return true;
    } else {
      streak = 1;
      prev = tok;
    }
  }
  return false;
}

function firstToken(line: string): string | null {
  const m = line.match(/^([A-Za-zÀ-ÿ'’]{2,12})\b/);
  if (!m) return null;
  const t = m[1].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const watch = new Set([
    "quand",
    "lorsque",
    "si",
    "when",
    "if",
    "porque",
    "cuando",
    "mientras",
    "parce",
    "because",
  ]);
  return watch.has(t) ? t : null;
}
/** Only when productFrame = la_mesa_dinners — dinners ≠ market-entry consulting pitch. */
const LA_MESA_MARKET_ENTRY_MISMATCH = {
  id: "la_mesa_market_entry_mismatch",
  re: /\b(pyme europea|pme europ[eé]enne|entrada (a |al )?mercado|d[eé]veloppement (international|au mexique)|desarrollo internacional)\b/i,
  weight: 2,
};

export function detectSlop(
  text: string,
  options: {
    contentLanguage?: ContentLanguage;
    productFrame?: ProductFrame;
  } = {},
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

  if (detectAnaphoraStack(combined)) {
    flags.push("anaphora_stack");
    penalty += 3;
  }

  if (
    options.productFrame === "la_mesa_dinners" &&
    LA_MESA_MARKET_ENTRY_MISMATCH.re.test(combined)
  ) {
    flags.push(LA_MESA_MARKET_ENTRY_MISMATCH.id);
    penalty += LA_MESA_MARKET_ENTRY_MISMATCH.weight;
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
