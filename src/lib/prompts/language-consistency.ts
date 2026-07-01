import type { ContentLanguage } from "@/types/workspace";

export const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function languageLabel(contentLanguage: ContentLanguage): string {
  return LANGUAGE_LABELS[contentLanguage] ?? "English";
}

/** Strict single-language rule for LLM system prompts. */
export function languageOnlyRule(contentLanguage: ContentLanguage): string {
  const lang = languageLabel(contentLanguage);
  return `- Language (non-negotiable): write 100% in ${lang}. Every field, sentence, bridge phrase, and hashtag must be ${lang} only — never mix ${lang} with another language in the same output. If reference material is in another language, rewrite fully into ${lang}; do not leave foreign phrases or sentences.`;
}

export function ctaBridgeExamples(contentLanguage: ContentLanguage): string {
  switch (contentLanguage) {
    case "fr":
      return `"Pour aller plus loin", "Dans ce cas", "Si c'est votre situation"`;
    case "es":
      return `"Para ir más allá", "En ese caso", "Si es su situación"`;
    default:
      return `"To go further", "In that case", "If that's you"`;
  }
}

export function conditionalSetupExample(contentLanguage: ContentLanguage): string {
  switch (contentLanguage) {
    case "fr":
      return `"Si vous êtes…"`;
    case "es":
      return `"Si usted es…"`;
    default:
      return `"If you are…"`;
  }
}
