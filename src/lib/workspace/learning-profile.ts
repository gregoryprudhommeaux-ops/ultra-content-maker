import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type {
  ArticleRefinement,
  AudienceProfile,
  AuthorProfile,
  ContentLanguage,
  CtaIntensity,
  EmojiLevel,
  GapAnswerValue,
  ProfileGapQuestion,
} from "@/types/workspace";
import { isCorrosiveToneEdge } from "@/lib/articles/refinement";
import { emojiInstruction } from "@/lib/prompts/emoji-instruction";
import { getClientFirestore } from "@/lib/firebase/client";
import { toDate } from "./firestore-utils";

const DOC_ID = "profile";
const MAX_ENTRIES = 40;
export const LEARNED_SECTION_TITLE = "## Préférences apprises (à appliquer systématiquement)";

export type LearningSource =
  | "gaps"
  | "article_refinement"
  | "article_validate"
  | "emoji";

export interface LearningEntry {
  source: LearningSource;
  text: string;
  /** When set, refinement lines belong to one article (replaced on update, not duplicated). */
  articleId?: string;
  createdAt: Date;
}

export interface LearningProfile {
  emojiLevel: EmojiLevel;
  preferredCtaStyle?: CtaIntensity;
  entries: LearningEntry[];
  updatedAt: Date;
}

function learningRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "learning", DOC_ID);
}

export async function getLearningProfile(
  userId: string,
): Promise<LearningProfile | null> {
  const snap = await getDoc(learningRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  const entries = (d.entries as LearningEntry[] | undefined) ?? [];
  return {
    emojiLevel: (d.emojiLevel as EmojiLevel) ?? "light",
    preferredCtaStyle: d.preferredCtaStyle as CtaIntensity | undefined,
    entries: entries.map((e) => ({
      ...e,
      articleId: e.articleId as string | undefined,
      createdAt: e.createdAt instanceof Date ? e.createdAt : toDate(e.createdAt),
    })),
    updatedAt: toDate(d.updatedAt),
  };
}

const EMOJI_PREF_LABELS: Record<ContentLanguage, Record<EmojiLevel, string>> = {
  fr: {
    none: "Préférence emojis: aucun",
    light: "Préférence emojis: un peu",
    heavy: "Préférence emojis: beaucoup",
  },
  en: {
    none: "Emoji preference: none",
    light: "Emoji preference: a little",
    heavy: "Emoji preference: a lot",
  },
  es: {
    none: "Preferencia emojis: ninguno",
    light: "Preferencia emojis: un poco",
    heavy: "Preferencia emojis: muchos",
  },
};

/** Default emoji preference set during onboarding (audience step). */
export async function saveDefaultEmojiLevel(
  userId: string,
  emojiLevel: EmojiLevel,
  contentLanguage: ContentLanguage = "fr",
): Promise<void> {
  const prev = await getLearningProfile(userId);
  const labels = EMOJI_PREF_LABELS[contentLanguage] ?? EMOJI_PREF_LABELS.fr;
  const kept = (prev?.entries ?? []).filter((e) => e.source !== "emoji");
  const now = new Date();
  const entries: LearningEntry[] = [
    { source: "emoji" as const, text: labels[emojiLevel], createdAt: now },
    ...kept,
  ].slice(0, MAX_ENTRIES);

  await setDoc(
    learningRef(userId),
    {
      emojiLevel,
      preferredCtaStyle: prev?.preferredCtaStyle ?? null,
      entries: entries.map(serializeLearningEntry),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const { syncPersonaAfterProfileSave } = await import(
    "@/lib/persona/sync-after-profile-save"
  );
  await syncPersonaAfterProfileSave(userId);
}

export async function appendLearningEntries(
  userId: string,
  newEntries: Omit<LearningEntry, "createdAt">[],
  prefs?: { emojiLevel?: EmojiLevel; preferredCtaStyle?: CtaIntensity },
) {
  const prev = await getLearningProfile(userId);
  const now = new Date();
  const merged: LearningEntry[] = [
    ...newEntries.map((e) => ({ ...e, createdAt: now })),
    ...(prev?.entries ?? []),
  ].slice(0, MAX_ENTRIES);

  await setDoc(learningRef(userId), {
    emojiLevel: prefs?.emojiLevel ?? prev?.emojiLevel ?? "light",
    preferredCtaStyle: prefs?.preferredCtaStyle ?? prev?.preferredCtaStyle ?? null,
    entries: merged.map(serializeLearningEntry),
    updatedAt: serverTimestamp(),
  });
}

function serializeLearningEntry(e: LearningEntry) {
  return {
    source: e.source,
    text: e.text,
    articleId: e.articleId ?? null,
    createdAt: e.createdAt,
  };
}

/** Replace this article's refinement lines in learning (no duplicate on each keystroke). */
export async function replaceArticleRefinementLearning(
  userId: string,
  articleId: string,
  refinement: ArticleRefinement,
  contentLanguage: ContentLanguage,
) {
  const prev = await getLearningProfile(userId);
  const now = new Date();
  const globalEmoji = prev?.emojiLevel ?? "light";
  const fromRefinement = entriesFromRefinement(
    refinement,
    contentLanguage,
    globalEmoji,
  ).map((e) => ({
    ...e,
    articleId,
    createdAt: now,
  }));
  const kept = (prev?.entries ?? []).filter(
    (e) => !(e.source === "article_refinement" && e.articleId === articleId),
  );
  const merged: LearningEntry[] = [...fromRefinement, ...kept].slice(0, MAX_ENTRIES);

  await setDoc(learningRef(userId), {
    emojiLevel: prev?.emojiLevel ?? "light",
    preferredCtaStyle: prev?.preferredCtaStyle ?? null,
    entries: merged.map(serializeLearningEntry),
    updatedAt: serverTimestamp(),
  });
}

const LEARNED_MARKERS = [
  LEARNED_SECTION_TITLE,
  "## Learned preferences (apply systematically)",
  "## Preferencias aprendidas (aplicar sistemáticamente)",
];

export function stripLearnedSection(promptText: string): string {
  let cut = -1;
  for (const marker of LEARNED_MARKERS) {
    const idx = promptText.indexOf(marker);
    if (idx !== -1 && (cut === -1 || idx < cut)) cut = idx;
  }
  if (cut === -1) return promptText.trim();
  return promptText.slice(0, cut).trim();
}

const REFINEMENT_LABELS: Record<
  ContentLanguage,
  Record<string, { yes: string; no: string; partial: string }>
> = {
  fr: {
    tone: { yes: "Ton validé", no: "Ton à corriger", partial: "Ton partiellement ok" },
    theme: { yes: "Thème validé", no: "Thème à changer", partial: "Thème partiellement ok" },
    length: { yes: "Longueur ok", no: "Longueur à ajuster", partial: "Longueur partiellement ok" },
    hook: { yes: "Accroche forte", no: "Accroche faible", partial: "Accroche à renforcer" },
  },
  en: {
    tone: { yes: "Tone validated", no: "Tone to fix", partial: "Tone partially ok" },
    theme: { yes: "Theme validated", no: "Theme to change", partial: "Theme partially ok" },
    length: { yes: "Length ok", no: "Length to adjust", partial: "Length partially ok" },
    hook: { yes: "Strong hook", no: "Weak hook", partial: "Hook needs work" },
  },
  es: {
    tone: { yes: "Tono validado", no: "Tono a corregir", partial: "Tono parcialmente ok" },
    theme: { yes: "Tema validado", no: "Tema a cambiar", partial: "Tema parcialmente ok" },
    length: { yes: "Longitud ok", no: "Longitud a ajustar", partial: "Longitud parcialmente ok" },
    hook: { yes: "Gancho fuerte", no: "Gancho débil", partial: "Gancho a reforzar" },
  },
};

export function entriesFromGapAnswers(
  questions: ProfileGapQuestion[],
  answers: Record<string, GapAnswerValue>,
): Omit<LearningEntry, "createdAt">[] {
  const out: Omit<LearningEntry, "createdAt">[] = [];
  for (const q of questions) {
    const v = answers[q.id];
    if (v === undefined) continue;
    const text = Array.isArray(v) ? v.join(", ") : String(v).trim();
    if (!text) continue;
    out.push({ source: "gaps", text: `${q.label}: ${text}` });
  }
  return out;
}

export function entriesFromRefinement(
  refinement: ArticleRefinement,
  lang: ContentLanguage,
  globalEmojiLevel: EmojiLevel = "light",
): Omit<LearningEntry, "createdAt">[] {
  const labels = REFINEMENT_LABELS[lang] ?? REFINEMENT_LABELS.en;
  const out: Omit<LearningEntry, "createdAt">[] = [];

  if (
    refinement.emojiLevel &&
    refinement.emojiLevel !== globalEmojiLevel
  ) {
    const postLabels: Record<ContentLanguage, string> = {
      fr: "Emojis pour ce post",
      en: "Emojis for this post",
      es: "Emojis para este post",
    };
    out.push({
      source: "article_refinement",
      text: `${postLabels[lang] ?? postLabels.en}: ${emojiInstruction(refinement.emojiLevel, lang)}`,
    });
  }

  for (const q of refinement.questions) {
    if (!q.answer && !q.comment?.trim()) continue;
    const base = labels[q.id]?.[q.answer ?? "partial"] ?? q.id;
    const line = q.comment?.trim() ? `${base} — ${q.comment.trim()}` : base;
    out.push({ source: "article_refinement", text: line });
  }

  if (refinement.globalComment?.trim()) {
    const globalLabels: Record<ContentLanguage, string> = {
      fr: "Commentaire global",
      en: "Global comment",
      es: "Comentario global",
    };
    const prefix = globalLabels[lang] ?? globalLabels.en;
    out.push({
      source: "article_refinement",
      text: `${prefix}: ${refinement.globalComment.trim()}`,
    });
  }

  if (isCorrosiveToneEdge(refinement)) {
    const corrosiveLabels: Record<ContentLanguage, string> = {
      fr: "Ligne éditoriale parfois utilisée : à contre-pied d'une idée reçue ou d'une actu (jamais politique, racisme, insultes)",
      en: "Editorial line sometimes used: contrarian to a received idea or news angle (never politics, racism, insults)",
      es: "Línea editorial a veces usada: contrario a una idea recibida o actu (nunca política, racismo, insultos)",
    };
    out.push({
      source: "article_refinement",
      text: corrosiveLabels[lang] ?? corrosiveLabels.en,
    });
  }

  return out;
}

export function entryFromCtaChoice(
  style: CtaIntensity,
  lang: ContentLanguage,
): Omit<LearningEntry, "createdAt"> {
  const labels: Record<ContentLanguage, Record<CtaIntensity, string>> = {
    fr: { soft: "CTA préféré: doux", medium: "CTA préféré: moyen", pushy: "CTA préféré: pushy" },
    en: { soft: "Preferred CTA: soft", medium: "Preferred CTA: medium", pushy: "Preferred CTA: pushy" },
    es: { soft: "CTA preferido: suave", medium: "CTA preferido: medio", pushy: "CTA preferido: directo" },
  };
  return {
    source: "article_validate",
    text: labels[lang]?.[style] ?? labels.en[style],
  };
}

export function buildLearnedSectionMarkdown(
  profile: LearningProfile | null,
  enrichmentDetails: Record<string, GapAnswerValue>,
  lang: ContentLanguage,
  author?: AuthorProfile | null,
  audience?: AudienceProfile | null,
): string {
  const lines: string[] = [];
  const titles: Record<ContentLanguage, string> = {
    fr: LEARNED_SECTION_TITLE,
    en: "## Learned preferences (apply systematically)",
    es: "## Preferencias aprendidas (aplicar sistemáticamente)",
  };
  lines.push(titles[lang] ?? titles.fr);
  lines.push("");

  const profileHeadings: Record<
    ContentLanguage,
    { author: string; audience: string; role: string; positioning: string; target: string; focus: string; notes: string }
  > = {
    fr: {
      author: "**Profil auteur (à jour)**",
      audience: "**Audience cible (à jour)**",
      role: "Rôle",
      positioning: "Positionnement",
      target: "Cible",
      focus: "Focus contenu",
      notes: "Notes",
    },
    en: {
      author: "**Author profile (current)**",
      audience: "**Target audience (current)**",
      role: "Role",
      positioning: "Positioning",
      target: "Target",
      focus: "Content focus",
      notes: "Notes",
    },
    es: {
      author: "**Perfil autor (actual)**",
      audience: "**Audiencia (actual)**",
      role: "Rol",
      positioning: "Posicionamiento",
      target: "Objetivo",
      focus: "Enfoque",
      notes: "Notas",
    },
  };
  const H = profileHeadings[lang] ?? profileHeadings.fr;

  const authorLines: string[] = [];
  if (author?.roleTitle?.trim()) authorLines.push(`${H.role}: ${author.roleTitle.trim()}`);
  if (author?.positioningLine?.trim()) {
    authorLines.push(`${H.positioning}: ${author.positioningLine.trim()}`);
  }
  if (authorLines.length > 0) {
    lines.push(`- ${H.author}`);
    for (const l of authorLines) lines.push(`  - ${l}`);
  }

  if (audience && !audience.skipped) {
    const audLines: string[] = [];
    if (audience.targetLabel?.trim()) audLines.push(`${H.target}: ${audience.targetLabel.trim()}`);
    if (audience.contentFocus?.trim()) audLines.push(`${H.focus}: ${audience.contentFocus.trim()}`);
    if (audience.optionalNotes?.trim()) audLines.push(`${H.notes}: ${audience.optionalNotes.trim()}`);
    if (audLines.length > 0) {
      lines.push(`- ${H.audience}`);
      for (const l of audLines) lines.push(`  - ${l}`);
    }
  }

  if (profile?.emojiLevel) {
    lines.push(`- **Emojis:** ${emojiInstruction(profile.emojiLevel, lang)}`);
  }
  if (profile?.preferredCtaStyle) {
    const ctaLabels = {
      fr: { soft: "doux", medium: "moyen", pushy: "pushy" },
      en: { soft: "soft", medium: "medium", pushy: "pushy" },
      es: { soft: "suave", medium: "medio", pushy: "directo" },
    };
    const L = ctaLabels[lang] ?? ctaLabels.fr;
    lines.push(`- **CTA par défaut:** intensité ${L[profile.preferredCtaStyle]}`);
  }

  const enrichKeys = Object.keys(enrichmentDetails);
  if (enrichKeys.length > 0) {
    lines.push("- **Profil complété:**");
    for (const key of enrichKeys.slice(0, 20)) {
      const v = enrichmentDetails[key];
      const text = Array.isArray(v) ? v.join(", ") : String(v);
      if (text.trim()) lines.push(`  - ${key}: ${text}`);
    }
  }

  if (profile?.entries.length) {
    lines.push("- **Retours articles & questionnaire:**");
    const seen = new Set<string>();
    for (const e of profile.entries) {
      if (seen.has(e.text)) continue;
      seen.add(e.text);
      lines.push(`  - ${e.text}`);
    }
  }

  lines.push("");
  lines.push(
    lang === "fr"
      ? "_Intègre ces préférences dans chaque post: ton, structure, emojis, CTA, sujets à favoriser ou éviter._"
      : lang === "es"
        ? "_Integra estas preferencias en cada post: tono, estructura, emojis, CTA, temas a favorecer o evitar._"
        : "_Apply these preferences to every post: tone, structure, emojis, CTA, topics to favor or avoid._",
  );

  return lines.join("\n");
}
