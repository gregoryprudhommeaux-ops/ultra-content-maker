import { getAudienceProfile } from "@/lib/workspace/audience";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getResolvedAuthorProfile } from "@/lib/profile/resolve-author-profile";
import { ingestWorkspaceLearningSignals } from "@/lib/persona/ingest-workspace-learning";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import {
  commitPersonaPromptUpdate,
  getPersona,
} from "@/lib/workspace/persona";
import { listSources } from "@/lib/workspace/sources";
import { serializeForApi } from "@/lib/workspace/serialize-profile";
import { getClientAuth } from "@/lib/firebase/client";
import type { ContentLanguage } from "@/types/workspace";
import {
  buildLearnedSectionMarkdown,
  getLearningProfile,
  stripLearnedSection,
} from "@/lib/workspace/learning-profile";
import {
  enrichmentFingerprint,
  learningEntriesFingerprint,
} from "@/lib/persona/persona-changelog";
import { stripVersionHeader } from "@/lib/persona/persona-version";

export type RefreshPersonaResult =
  | { ok: true; promptText: string; changeSummary: string }
  | { ok: false; error: "no_persona" | "no_llm" | "no_token" | "api_error"; detail?: string };

/** LLM refresh of the Persona base prompt after profile or user refinement. */
export async function refreshPersonaFromProfile(
  userId: string,
  contentLanguage: ContentLanguage,
  userComment?: string,
): Promise<RefreshPersonaResult> {
  const persona = await getPersona(userId);
  if (!persona?.promptText?.trim()) {
    return { ok: false, error: "no_persona" };
  }

  const llmProfile = await getUserLlmProfile(userId);
  if (!llmProfile?.apiKey) {
    return { ok: false, error: "no_llm" };
  }

  const auth = getClientAuth();
  const token = auth ? await auth.currentUser?.getIdToken() : null;
  if (!token) {
    return { ok: false, error: "no_token" };
  }

  await ingestWorkspaceLearningSignals(userId).catch(() => {});

  const [author, audience, sources, enrichment, learning] = await Promise.all([
    getResolvedAuthorProfile(userId),
    getAudienceProfile(userId),
    listSources(userId),
    getProfileEnrichment(userId),
    getLearningProfile(userId),
  ]);

  const currentBase = stripLearnedSection(
    stripVersionHeader(persona.promptText),
  );

  const res = await fetch("/api/persona/refresh-profile", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentBasePrompt: currentBase,
      author: serializeForApi(author),
      audience: serializeForApi(audience),
      sources: serializeForApi(sources),
      profileEnrichment: enrichment?.details ?? {},
      contentLanguage: author?.contentLanguage ?? contentLanguage,
      userComment: userComment?.trim() || undefined,
      llm: {
        provider: llmProfile.provider,
        apiKey: llmProfile.apiKey,
        model: llmProfile.model,
      },
    }),
  });

  const data = (await res.json()) as {
    promptText?: string;
    changeSummary?: string;
    error?: string;
    detail?: string;
  };

  if (!res.ok || !data.promptText) {
    return {
      ok: false,
      error: "api_error",
      detail: data.detail ?? data.error,
    };
  }

  const summary =
    data.changeSummary?.trim() ||
    (userComment?.trim()
      ? contentLanguage === "fr"
        ? "Persona affiné selon vos précisions."
        : contentLanguage === "es"
          ? "Persona refinado según tus indicaciones."
          : "Persona refined from your notes."
      : undefined);

  const lang = (author?.contentLanguage ?? contentLanguage) as ContentLanguage;
  const learned = buildLearnedSectionMarkdown(
    learning,
    enrichment?.details ?? {},
    lang,
    author,
    audience,
  );
  const fullPrompt = `${data.promptText.trim()}\n\n${learned}`;

  await commitPersonaPromptUpdate(userId, fullPrompt, {
    reason: userComment?.trim() ? "user_refinement" : "profile_sync",
    changeSummary: summary,
    contentLanguage: lang,
    profileFingerprint: true,
    learningSyncHash: learningEntriesFingerprint(learning?.entries ?? []),
    enrichmentFingerprint: enrichmentFingerprint(enrichment?.details ?? {}),
  });

  const updated = await getPersona(userId);
  return {
    ok: true,
    promptText: updated?.promptText ?? data.promptText,
    changeSummary: data.changeSummary ?? "",
  };
}
