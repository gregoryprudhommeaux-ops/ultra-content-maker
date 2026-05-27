import { LINKEDIN_2026_SYSTEM_RULES } from "@/lib/prompts/linkedin-2026-rules";
import { LINKEDIN_LENGTH_PROMPT_RULE } from "@/lib/linkedin/fit-linkedin-post";
import type {
  ArticleTranslationMode,
  ContentLanguage,
} from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French (France)",
  en: "English (US professional B2B)",
  es: "Spanish (Mexico — professional B2B, localized references)",
};

const TARGET_AUDIENCE_HINT: Record<ContentLanguage, string> = {
  fr: "French-speaking professionals in France/EU.",
  en: "English-speaking professionals (US/UK) — adapt examples away from France-only context when needed.",
  es: "Spanish-speaking professionals in Mexico/LATAM — adapt examples away from France-only context when needed.",
};

export function buildArticleTranslateSystemPrompt(
  targetLanguage: ContentLanguage,
  mode: ArticleTranslationMode,
): string {
  const target = LANGUAGE_LABELS[targetLanguage];
  const audience = TARGET_AUDIENCE_HINT[targetLanguage];

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
${LINKEDIN_2026_SYSTEM_RULES}

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
  targetLanguage: ContentLanguage;
  mode: ArticleTranslationMode;
  personaExcerpt: string;
  hook: string;
  body: string;
  ps?: string;
  hashtags?: string[];
  postBrief?: import("@/types/workspace").PostBrief;
}): string {
  return JSON.stringify(
    {
      sourceLanguage: LANGUAGE_LABELS[input.sourceLanguage],
      targetLanguage: LANGUAGE_LABELS[input.targetLanguage],
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
