import type { PostBrief, PostObjective } from "@/types/workspace";

const STORAGE_KEY = "ucm:post-brief";

export const DEFAULT_POST_BRIEF: PostBrief = {
  objective: "credibility",
  problem: "",
  pointOfView: "",
  proof: "",
};

export function loadStoredPostBrief(): PostBrief {
  if (typeof window === "undefined") return { ...DEFAULT_POST_BRIEF };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_POST_BRIEF };
    const parsed = JSON.parse(raw) as Partial<PostBrief>;
    return {
      objective: isObjective(parsed.objective)
        ? parsed.objective
        : DEFAULT_POST_BRIEF.objective,
      problem: typeof parsed.problem === "string" ? parsed.problem : "",
      pointOfView:
        typeof parsed.pointOfView === "string" ? parsed.pointOfView : "",
      proof: typeof parsed.proof === "string" ? parsed.proof : "",
    };
  } catch {
    return { ...DEFAULT_POST_BRIEF };
  }
}

export function saveStoredPostBrief(brief: PostBrief): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
}

function isObjective(v: unknown): v is PostObjective {
  return (
    v === "awareness" ||
    v === "credibility" ||
    v === "conversation" ||
    v === "leads"
  );
}
