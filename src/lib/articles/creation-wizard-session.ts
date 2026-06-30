import type { WizardInspirationContext } from "@/lib/inspiration/wizard-context";
import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { normalizePostBrief } from "@/lib/articles/post-brief-objectives";
import type { ArticleScope, EmojiLevel, PostBrief } from "@/types/workspace";

const STORAGE_KEY = "ucm:creation-wizard-session";
const MAX_AGE_MS = 30 * 60 * 1000;

/** Query flag on `/articles/new` — skip session restore and show the mode picker. */
export const CREATION_FRESH_PARAM = "fresh";

export function isFreshCreationRequest(
  params: Pick<URLSearchParams, "get">,
): boolean {
  return params.get(CREATION_FRESH_PARAM) === "1";
}

export type WizardSessionStep =
  | "mode"
  | "news"
  | "inspiration-input"
  | "paste"
  | "inspiration-url"
  | "inspiration-library"
  | "brief"
  | "generating"
  | "draft-done";

export type CreationWizardSession = {
  v: 1;
  savedAt: number;
  step: WizardSessionStep;
  mode: WizardCreationMode | null;
  postBrief: PostBrief;
  inspirationCtx: WizardInspirationContext | null;
  selectedNewsId: string | null;
  draftArticleId: string | null;
  draftRevision: number;
  targetScope: ArticleScope;
  emojiLevel: EmojiLevel;
  briefSuggested: boolean;
};

function isWizardMode(v: unknown): v is WizardCreationMode {
  return v === "profile" || v === "news" || v === "inspiration";
}

function isWizardStep(v: unknown): v is WizardSessionStep {
  return (
    v === "mode" ||
    v === "news" ||
    v === "inspiration-input" ||
    v === "paste" ||
    v === "inspiration-url" ||
    v === "inspiration-library" ||
    v === "brief" ||
    v === "generating" ||
    v === "draft-done"
  );
}

export function loadCreationWizardSession(): CreationWizardSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreationWizardSession>;
    if (parsed.v !== 1 || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (!isWizardStep(parsed.step)) return null;
    if (parsed.mode !== null && !isWizardMode(parsed.mode)) return null;
    if (!parsed.postBrief || typeof parsed.postBrief !== "object") return null;

    return {
      v: 1,
      savedAt: parsed.savedAt,
      step: parsed.step,
      mode: parsed.mode ?? null,
      postBrief: normalizePostBrief(parsed.postBrief),
      inspirationCtx: (parsed.inspirationCtx as WizardInspirationContext | null) ?? null,
      selectedNewsId:
        typeof parsed.selectedNewsId === "string" ? parsed.selectedNewsId : null,
      draftArticleId:
        typeof parsed.draftArticleId === "string" ? parsed.draftArticleId : null,
      draftRevision:
        typeof parsed.draftRevision === "number" ? parsed.draftRevision : 0,
      targetScope:
        parsed.targetScope === "niche" ? "niche" : "generalist",
      emojiLevel:
        parsed.emojiLevel === "none" ||
        parsed.emojiLevel === "light" ||
        parsed.emojiLevel === "heavy"
          ? parsed.emojiLevel
          : "light",
      briefSuggested: parsed.briefSuggested === true,
    };
  } catch {
    return null;
  }
}

export function saveCreationWizardSession(session: CreationWizardSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, v: 1, savedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearCreationWizardSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
