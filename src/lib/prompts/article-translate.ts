import { buildLinkedIn2026SystemRules } from "@/lib/prompts/linkedin-2026-rules";
import { LINKEDIN_LENGTH_PROMPT_RULE } from "@/lib/linkedin/fit-linkedin-post";
import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import {
  TRANSLATION_LOCALE_AUDIENCE,
  TRANSLATION_LOCALE_LABELS,
} from "@/lib/articles/translation-locale";
import type {
  ArticleTranslationLocale,
  ArticleTranslationMode,
  ContentLanguage,
} from "@/types/workspace";

const SOURCE_LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French (France)",
  en: "English",
  es: "Spanish",
};

function slopRulesLanguageForLocale(locale: ArticleTranslationLocale): ContentLanguage {
  if (locale === "fr") return "fr";
  if (locale.startsWith("es")) return "es";
  return "en";
}

export function buildArticleTranslateSystemPrompt(
  targetLocale: ArticleTranslationLocale,
  mode: ArticleTranslationMode,
): string {
  const target = TRANSLATION_LOCALE_LABELS[targetLocale];
  const audience = TRANSLATION_LOCALE_AUDIENCE[targetLocale];

  const modeRules =
    mode === "literal"
      ? `MODE: literal
- Translate meaning faithfully into ${target}.
- Preserve structure, line breaks, and rhetorical rhythm.
- Keep proper nouns unless a well-known localized equivalent exists.
- Do NOT add new claims or examples.`
      : `MODE: localized reinterpretation
- Rewrite for ${target} as a native LinkedIn post for: ${audience}
- Same strategic intent, POV, and proof level — but adapt references (companies, regulations, cultural examples) to resonate locally.
- May rephrase hooks and examples; must NOT invent fake metrics or fake clients.
- Still one author's voice (Persona excerpt provided).`;

  return `You translate or localize a validated LinkedIn post.
${buildLinkedIn2026SystemRules(slopRulesLanguageForLocale(targetLocale))}

${modeRules}

${LINKEDIN_LENGTH_PROMPT_RULE}

Return JSON only:
{
  "hook": string,
  "body": string,
  "ps": string or omit,
  "hashtags": ["tag1","tag2","tag3","tag4"] or []
}

Rules:
- All output in ${target}.
- hook + body + ps must fit LinkedIn limits (use line breaks like the source).
- hashtags: 0–4 tags without #, relevant in target language/market.
- No http(s) links in hook, body, or ps.
- exportText is NOT required in JSON (client builds it).`;
}

export function buildArticleTranslateUserPrompt(input: {
  sourceLanguage: ContentLanguage;
  targetLocale: ArticleTranslationLocale;
  mode: ArticleTranslationMode;
  personaExcerpt: string;
  hook: string;
  body: string;
  ps?: string;
  hashtags?: string[];
  postBrief?: import("@/types/workspace").PostBrief;
  authorSteering?: AuthorSteeringPayload | null;
}): string {
  return JSON.stringify(
    injectAuthorSteering(
      {
        sourceLanguage: SOURCE_LANGUAGE_LABELS[input.sourceLanguage],
        targetLanguage: TRANSLATION_LOCALE_LABELS[input.targetLocale],
        mode: input.mode,
        personaExcerpt: input.personaExcerpt.slice(0, 5000),
        post: {
          hook: input.hook,
          body: input.body,
          ps: input.ps ?? "",
          hashtags: input.hashtags ?? [],
        },
        postBrief: input.postBrief ?? null,
      },
      input.authorSteering,
    ),
    null,
    2,
  );
}

export function normalizeArticleTranslationOutput(raw: {
  hook?: unknown;
  body?: unknown;
  ps?: unknown;
  hashtags?: unknown;
}): { hook: string; body: string; ps?: string; hashtags: string[] } | null {
  const hook = String(raw.hook ?? "").trim();
  const body = String(raw.body ?? "").trim();
  if (!hook || !body) return null;
  const ps = String(raw.ps ?? "").trim();
  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 4)
    : [];
  return {
    hook,
    body,
    ps: ps || undefined,
    hashtags,
  };
}
