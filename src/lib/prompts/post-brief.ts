import type { ContentLanguage, PostBrief } from "@/types/workspace";

const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

const OBJECTIVE_LABELS: Record<PostBrief["objective"], string> = {
  awareness: "visibility / reach",
  credibility: "credibility / authority",
  conversation: "qualified conversation in comments",
  leads: "inbound interest (DMs, calls)",
};

export function buildPostBriefInstruction(
  brief: PostBrief,
  contentLanguage: ContentLanguage,
): string {
  const lang = LANGUAGE_LABELS[contentLanguage] ?? "English";
  const goal = OBJECTIVE_LABELS[brief.objective];

  return `POST BRIEF (mandatory — all ${lang} posts in this batch must follow):
- Objective: ${brief.objective} — ${goal}
- Audience problem: ${brief.problem.trim()}
- Author point of view: ${brief.pointOfView.trim()}
- Proof to weave in (required): ${brief.proof.trim()}

Each post must visibly reflect the problem, POV, and proof. Match the objective in hook, body shape, and closing (no hard-sell CTA block — user adds a signature CTA later; body ending must not duplicate that CTA's opener).`;
}

export function isPostBriefComplete(brief: PostBrief): boolean {
  return (
    !!brief.objective &&
    brief.problem.trim().length >= 8 &&
    brief.pointOfView.trim().length >= 8 &&
    brief.proof.trim().length >= 8
  );
}
