import type { LlmConfig } from "@/lib/llm/config";
import { configFromUserLlm } from "@/lib/llm/config";
import { chatCompletionJson, mergeUsageLog } from "@/lib/llm/chat";
import { parseLlmJson } from "@/lib/llm/parse-json";
import { isInvalidApiKeyError } from "@/lib/llm/provider-errors";
import { fetchLinkedInPublicProfile } from "@/lib/linkedin/fetch-public-profile";
import {
  buildBasicPrefillFromPublicProfile,
  buildLinkedInProfilePrefillSystemPrompt,
  buildLinkedInProfilePrefillUserPrompt,
  buildLinkedInProfileSynthesisSystemPrompt,
  buildLinkedInProfileSynthesisUserPrompt,
  isPersonaUsefulBio,
  normalizeLinkedInProfilePrefill,
  type LinkedInProfilePrefillLlmResult,
} from "@/lib/prompts/linkedin-profile-prefill";
import type { ContentLanguage } from "@/types/workspace";

export type LinkedInProfilePrefillResult = LinkedInProfilePrefillLlmResult;

export function resolveLinkedInBrowseLlm(primary: LlmConfig | null): LlmConfig | null {
  if (primary?.provider === "perplexity") return primary;

  const perplexityKey = process.env.PERPLEXITY_API_KEY?.trim();
  if (perplexityKey && perplexityKey !== primary?.apiKey) {
    return configFromUserLlm({ provider: "perplexity", apiKey: perplexityKey });
  }

  return primary;
}

function llmCandidates(primary: LlmConfig): LlmConfig[] {
  const browse = resolveLinkedInBrowseLlm(primary);
  const out: LlmConfig[] = [];
  if (browse) out.push(browse);
  if (!browse || browse.apiKey !== primary.apiKey || browse.provider !== primary.provider) {
    out.push(primary);
  }
  return out;
}

async function callBrowsePrefill(
  profileUrl: string,
  llm: LlmConfig,
  contentLanguage: ContentLanguage,
  userId?: string,
): Promise<LinkedInProfilePrefillLlmResult> {
  const raw = await chatCompletionJson(
    llm,
    [
      {
        role: "system",
        content: buildLinkedInProfilePrefillSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildLinkedInProfilePrefillUserPrompt(profileUrl, contentLanguage),
      },
    ],
    userId
      ? mergeUsageLog(userId, "linkedin/profile-prefill/browse", {
          maxTokens: 1600,
          temperature: 0.3,
          timeoutMs: 90_000,
        })
      : { maxTokens: 1600, temperature: 0.3, timeoutMs: 90_000 },
  );

  const parsed = parseLlmJson<LinkedInProfilePrefillLlmResult>(raw);
  return normalizeLinkedInProfilePrefill(parsed);
}

async function callSynthesisPrefill(
  profileUrl: string,
  contextText: string,
  llm: LlmConfig,
  contentLanguage: ContentLanguage,
  userId?: string,
): Promise<LinkedInProfilePrefillLlmResult> {
  const raw = await chatCompletionJson(
    llm,
    [
      {
        role: "system",
        content: buildLinkedInProfileSynthesisSystemPrompt(contentLanguage),
      },
      {
        role: "user",
        content: buildLinkedInProfileSynthesisUserPrompt(
          profileUrl,
          contextText,
          contentLanguage,
        ),
      },
    ],
    userId
      ? mergeUsageLog(userId, "linkedin/profile-prefill/synthesis", {
          maxTokens: 1800,
          temperature: 0.35,
        })
      : { maxTokens: 1800, temperature: 0.35 },
  );

  const parsed = parseLlmJson<LinkedInProfilePrefillLlmResult>(raw);
  const normalized = normalizeLinkedInProfilePrefill(parsed);
  if (normalized.accessible && isPersonaUsefulBio(normalized.positioningLine)) {
    return normalized;
  }
  throw new Error("synthesis_empty");
}

function isRetryableLlmError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  if (isInvalidApiKeyError(error.message)) return false;
  return true;
}

function isStrongPrefill(result: LinkedInProfilePrefillLlmResult): boolean {
  const role = result.roleTitle?.trim() ?? "";
  const bio = result.positioningLine?.trim() ?? "";
  return role.length >= 12 && isPersonaUsefulBio(bio) && bio.length >= 80;
}

function looksLikeAboutHook(title: string): boolean {
  return /^(catalyzing|based in|j'aide|j'accompagne|i help|accompagne)/i.test(title.trim());
}

function pickBetterRoleTitle(llm?: string, basic?: string): string | undefined {
  const a = llm?.trim();
  const b = basic?.trim();
  if (a && looksLikeAboutHook(a) && b) return b;
  if (a?.includes("|")) return a;
  if (b?.includes("|")) return b;
  return a || b;
}

function mergeWithBasicFallback(
  primary: LinkedInProfilePrefillLlmResult,
  publicProfile: NonNullable<Awaited<ReturnType<typeof fetchLinkedInPublicProfile>>>,
  contentLanguage: ContentLanguage,
): LinkedInProfilePrefillLlmResult {
  const basic = buildBasicPrefillFromPublicProfile(publicProfile, contentLanguage);

  return normalizeLinkedInProfilePrefill({
    accessible: true,
    roleTitle: pickBetterRoleTitle(primary.roleTitle, basic.roleTitle),
    positioningLine: isPersonaUsefulBio(primary.positioningLine)
      ? primary.positioningLine
      : basic.positioningLine ?? primary.positioningLine,
    detectedLanguage: primary.detectedLanguage ?? basic.detectedLanguage ?? contentLanguage,
    verticalLabel: primary.verticalLabel ?? basic.verticalLabel,
    influenceAngle: primary.influenceAngle ?? basic.influenceAngle,
  });
}

export async function fetchLinkedInProfilePrefill(
  profileUrl: string,
  llm: LlmConfig | null,
  contentLanguage: ContentLanguage,
  userId?: string,
): Promise<LinkedInProfilePrefillResult> {
  const publicProfile = await fetchLinkedInPublicProfile(profileUrl);

  let bestLlmResult: LinkedInProfilePrefillLlmResult | null = null;

  if (llm) {
    for (const candidate of llmCandidates(llm)) {
      try {
        const browsed = await callBrowsePrefill(profileUrl, candidate, contentLanguage, userId);
        if (isStrongPrefill(browsed)) return browsed;
        if (!bestLlmResult && browsed.roleTitle) bestLlmResult = browsed;
      } catch (e) {
        if (!isRetryableLlmError(e)) break;
      }
    }
  }

  if (publicProfile && llm) {
    for (const candidate of llmCandidates(llm)) {
      try {
        const synthesized = await callSynthesisPrefill(
          profileUrl,
          publicProfile.contextText,
          candidate,
          contentLanguage,
          userId,
        );
        if (isStrongPrefill(synthesized)) return synthesized;
        bestLlmResult = synthesized;
      } catch (e) {
        if (!isRetryableLlmError(e)) break;
      }
    }
  }

  if (publicProfile) {
    const basic = buildBasicPrefillFromPublicProfile(publicProfile, contentLanguage);
    if (bestLlmResult) {
      return mergeWithBasicFallback(bestLlmResult, publicProfile, contentLanguage);
    }
    return basic;
  }

  if (bestLlmResult) return bestLlmResult;

  if (llm) {
    for (const candidate of llmCandidates(llm)) {
      try {
        const browsed = await callBrowsePrefill(profileUrl, candidate, contentLanguage, userId);
        if (browsed.accessible && (browsed.roleTitle || browsed.positioningLine)) {
          return browsed;
        }
      } catch (e) {
        if (!isRetryableLlmError(e)) break;
      }
    }
  }

  return { accessible: false };
}
