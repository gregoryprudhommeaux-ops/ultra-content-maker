import type { CreatorRadarSuggestion } from "@/types/creator-radar";

const SESSION_KEY = "ucm:creator-radar-inspire";

export function stashRadarInspire(creator: CreatorRadarSuggestion): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(creator));
}

export function consumeRadarInspire(): CreatorRadarSuggestion | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(SESSION_KEY);
  try {
    return JSON.parse(raw) as CreatorRadarSuggestion;
  } catch {
    return null;
  }
}
