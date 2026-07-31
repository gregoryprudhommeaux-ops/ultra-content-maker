import { buildContentNichePromptBlock, resolveContentNicheFromSteering } from "@/lib/articles/content-niche";
import { buildHumanWritingRules } from "@/lib/articles/human-writing";
import { LINKEDIN_HASHTAG_COUNT } from "@/lib/linkedin/hashtags";
import { resolveContentArchetype } from "@/lib/persona/content-archetype";
import { buildPostBriefPromptContext } from "@/lib/persona/company-enrichment";
import {
  injectAuthorSteering,
  type AuthorSteeringPayload,
} from "@/lib/profile/author-steering-context";
import type { ArticleScope, ContentLanguage, EmojiLevel, PostBrief } from "@/types/workspace";
import { buildAntiAiHumanizerGenerationHints } from "./anti-ai-humanizer";
import { buildAntiLinkedInSlopRules } from "./anti-linkedin-slop";
import { emojiInstruction } from "./emoji-instruction";
import { languageLabel, languageOnlyRule } from "./language-consistency";
import { buildLinkedIn2026SystemRules } from "./linkedin-2026-rules";
import { buildPostBriefInstruction } from "./post-brief";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

/**
 * Generation path when the author pastes their own draft to revise
 * (Source → Coller mon brouillon) — NOT the external-inspiration "new angle" path.
 */
export function buildAuthorDraftReviseSystemPrompt(
  contentLanguage: ContentLanguage,
  targetScope: ArticleScope,
  emojiLevel: EmojiLevel = "light",
  profileEnrichment?: Record<string, unknown>,
  authorSteering?: AuthorSteeringPayload | null,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const emoji = emojiInstruction(emojiLevel, contentLanguage);
  const archetype = resolveContentArchetype({
    author: authorSteering?.author ?? null,
    profileEnrichment: profileEnrichment ?? authorSteering?.profileEnrichment ?? null,
  });
  const scopeLine =
    targetScope === "niche"
      ? `scope "niche" · keep ICP/vertical specificity from the draft and Persona.`
      : `scope "generalist" · keep broad readability while preserving the author's thesis.`;

  return `You are a senior LinkedIn B2B editor and anti-AI-slop reviser. Follow the expert Persona system prompt provided by the user.

${buildLinkedIn2026SystemRules(contentLanguage, archetype)}
${buildAntiLinkedInSlopRules(contentLanguage)}
${buildHumanWritingRules(contentLanguage)}
${buildAntiAiHumanizerGenerationHints(contentLanguage)}

${languageOnlyRule(contentLanguage)}

The user pasted THEIR OWN draft in authorDraft. Your job is to REVISE that draft — not invent a new post from a third-party reference.

Hard rules:
- ${scopeLine}
- PRESERVE: thesis, facts, numbers, named clients/tools (only if present in the draft), concrete stakes, and 1–2 voice markers (lexical tics, rhythm, hedges).
- REMOVE / REWRITE: LinkedIn AI-slop (not-X-its-Y, survey-hooks, school openers, engagement bait, loft vocab, uniform lists, decorative emoji spam, fake scenes, etc.).
- Do NOT invent new anecdotes, metrics, clients, or quotes.
- Do NOT pivot to a "distinct new angle" as if the draft were an external inspiration source.
- Improve clarity, punch, and human asperity · keep length within about ±20% of the draft.
- Strong hook (1-2 lines), body with line breaks, optional short PS (no hard-sell CTA block).
- Never paste external https:// URLs in hook, body, or PS.
- Emoji rule (non-negotiable): ${emoji}
- Add exactly ${LINKEDIN_HASHTAG_COUNT} hashtags (strings without #).

Return JSON only:
{
 "articles": [
 { "hook": string, "body": string, "ps": string or empty string, "scope": "${targetScope}", "hashtags": string[] }
 ]
}`;
}

export function buildAuthorDraftReviseUserPayload(
  personaPromptText: string,
  contentLanguage: ContentLanguage,
  authorDraft: string,
  targetScope: ArticleScope,
  postBrief?: PostBrief,
  profileEnrichment?: Record<string, unknown>,
  authorSteering?: AuthorSteeringPayload | null,
): string {
  const briefContext = buildPostBriefPromptContext({
    author: authorSteering?.author ?? null,
    profileEnrichment: profileEnrichment ?? authorSteering?.profileEnrichment ?? null,
    authorSteering,
  });
  const briefBlock = postBrief
    ? buildPostBriefInstruction(postBrief, contentLanguage, briefContext)
    : null;

  const nicheBlock = buildContentNichePromptBlock(
    resolveContentNicheFromSteering(personaPromptText, authorSteering),
    targetScope,
  );

  return JSON.stringify(
    injectAuthorSteering(
      {
        job: "REVISE_AUTHOR_DRAFT",
        contentLanguage: languageLabel(contentLanguage),
        targetScope,
        personaPromptText,
        profileEnrichment: profileEnrichment ?? {},
        authorDraft: authorDraft.trim().slice(0, 8000),
        postBrief: postBrief ?? null,
        postBriefInstruction: briefBlock,
        contentNicheInstruction: nicheBlock,
        instruction: `Revise authorDraft into one LinkedIn post (hook/body/ps). Keep the author's meaning and asperities. Strip AI-slop. Honor post brief when it clarifies intent — never replace the draft's core claim with a new invented angle.\n\n${nicheBlock}`,
      },
      authorSteering,
    ),
    null,
    2,
  );
}
