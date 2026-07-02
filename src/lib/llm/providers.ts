import type { LlmProvider } from "@/types/workspace";

/** Pure constants · safe to import from API routes (no Firestore client). */
export function defaultModelForProvider(provider: LlmProvider): string {
 switch (provider) {
 case "openai":
 return "gpt-4o";
 case "perplexity":
 return "sonar-pro";
 case "anthropic":
 return "claude-sonnet-4-20250514";
 case "google":
 return "gemini-1.5-flash";
 default:
 return "gpt-4o";
 }
}
