import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type { PostBrief } from "@/types/workspace";

const STORAGE_KEY = "ucm:post-brief";

export const DEFAULT_POST_BRIEF: PostBrief = normalizePostBrief({
  objectives: [{ objective: "credibility", priority: 1 }],
  problem: "",
  pointOfView: "",
  proof: "",
});

export function loadStoredPostBrief(): PostBrief {
  if (typeof window === "undefined") return { ...DEFAULT_POST_BRIEF };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_POST_BRIEF };
    const parsed = JSON.parse(raw) as Partial<PostBrief> & {
      objective?: string;
    };
    return normalizePostBrief(parsed);
  } catch {
    return { ...DEFAULT_POST_BRIEF };
  }
}

export function saveStoredPostBrief(brief: PostBrief): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brief));
}

