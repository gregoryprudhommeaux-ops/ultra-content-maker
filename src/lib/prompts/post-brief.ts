import { buildEditorialOsPromptBlock } from "@/lib/articles/editorial-os";
import {
 normalizePostBrief,
 sortObjectivesByPriority,
} from "@/lib/articles/post-brief-objectives";
import type { ContentLanguage, PostBrief, PostObjective } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
 fr: "French",
 en: "English",
 es: "Spanish",
};

const OBJECTIVE_LABELS: Record<PostObjective, string> = {
 awareness: "visibility / reach",
 credibility: "credibility / authority",
 conversation: "qualified conversation in comments",
 leads: "inbound interest (DMs, calls)",
};

export type PostBriefPromptContext = {
 /** Resolved company name when available; Persona/profile is fallback in prompts. */
 companyName?: string;
 /** First configured offer when brief.productFocus is empty. */
 defaultProductFocus?: string;
};

function companyNameRule(companyName?: string): string {
 if (companyName?.trim()) {
 return ` Company name "${companyName.trim()}" MUST appear naturally in hook and/or body (at least once, ideally in the first third).`;
 }
 return " Company name from Persona, authorSteering, or profile MUST appear naturally in hook and/or body (at least once, ideally early).";
}

function buildPostAngleBlock(
 brief: PostBrief,
 context?: PostBriefPromptContext,
): string {
 const productFocus = brief.productFocus?.trim() || context?.defaultProductFocus?.trim();
 const companyName = context?.companyName;

 if (brief.postAngle === "product") {
 const offerRule = productFocus
 ? ` Focus offer: "${productFocus}" — this product/offer name MUST appear at least once in hook and/or body.`
 : " Name the selected offer/product at least once when known from profile or brief.";
 return `- Post angle: PRODUCT / OFFER — lead with ICP problem and category POV · product is proof, not a brochure.${offerRule}${companyNameRule(companyName)} Do not center the post on the author's personal career or generic individual expertise · promote the company and its offer. No feature laundry list.`;
 }

 if (brief.postAngle === "expertise") {
 return `- Post angle: COMPANY & EXPERTISE — promote the company's category vision, culture, or leadership POV · NOT a personal career memoir or generic thought-leadership about the author alone.${companyNameRule(companyName)} The company is the subject; the author speaks as its leader/representative. Do not frame the post as pure personal expertise unless the brief explicitly requires it.`;
 }

 return "";
}

function formatObjectivesBlock(brief: PostBrief): string {
 const ranked = sortObjectivesByPriority(brief.objectives ?? []);
 if (ranked.length === 0) return "- Objectives: (none)";

 return ranked
 .map(
 ({ objective, priority }) =>
 `- Priority ${priority}: ${objective} · ${OBJECTIVE_LABELS[objective]}`,
 )
 .join("\n");
}

export function buildPostBriefInstruction(
 brief: PostBrief,
 contentLanguage: ContentLanguage,
 context?: PostBriefPromptContext,
): string {
 const normalized = normalizePostBrief(brief);
 const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
 const objectivesBlock = formatObjectivesBlock(normalized);
 const primary = sortObjectivesByPriority(normalized.objectives)[0]?.objective;

 const angleBlock = buildPostAngleBlock(normalized, context);
 const editorialOs = buildEditorialOsPromptBlock(normalized);

 return `POST BRIEF (mandatory · all ${lang} posts in this batch must follow):
${objectivesBlock}
${angleBlock ? `${angleBlock}\n` : ""}${editorialOs ? `${editorialOs}\n` : ""}- Primary objective (priority 1) drives hook, body shape, and closing; secondary objectives may appear subtly but must not dilute the main intent.
- Audience problem: ${normalized.problem.trim()}
- Author point of view: ${normalized.pointOfView.trim()}
- Proof to weave in (required): ${normalized.proof.trim()}

Each post must visibly reflect the problem, POV, and proof. Match the ranked objectives in hook, body shape, and closing (no hard-sell CTA block · user adds a signature CTA later; body ending must not duplicate that CTA's opener).${
 primary === "conversation"
 ? " When conversation is ranked, end with a specific question for the target ICP."
 : ""
 }`;
}

/** Rich enough brief to run niche check (optional UX — does not block generation). */
export function isPostBriefComplete(brief: PostBrief): boolean {
 const normalized = normalizePostBrief(brief);
 return (
 normalized.problem.trim().length >= 8 &&
 normalized.pointOfView.trim().length >= 8 &&
 normalized.proof.trim().length >= 8
 );
}

export type WizardCreationMode = "profile" | "news" | "inspiration" | "article";

export function isArticleTopicBriefComplete(brief: PostBrief): boolean {
 const normalized = normalizePostBrief(brief);
 return (
 normalized.problem.trim().length >= 8 &&
 normalized.pointOfView.trim().length >= 8
 );
}

/** Brief fields are optional for generation in every wizard mode. */
export function isWizardBriefComplete(brief: PostBrief, mode: WizardCreationMode): boolean {
 void brief;
 void mode;
 return true;
}
