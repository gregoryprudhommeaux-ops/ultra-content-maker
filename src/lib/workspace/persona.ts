import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type {
  ContentLanguage,
  PersonaDoc,
  PersonaHistoryReason,
  PersonaRecentChange,
  PersonaStatus,
  ProfileGapQuestion,
} from "@/types/workspace";
import { getClientFirestore } from "@/lib/firebase/client";
import { appendPersonaHistory, getPersonaHistoryEntry } from "./persona-history";
import { toDate } from "./firestore-utils";
import {
  applyVersionHeader,
  stripVersionHeader,
} from "@/lib/persona/persona-version";
import {
  enrichmentFingerprint,
  learningEntriesFingerprint,
  mapReasonToSource,
  profileFingerprint,
} from "@/lib/persona/persona-changelog";
import { getProfileEnrichment } from "./enrichment";
import { getLearningProfile } from "./learning-profile";
import { getAuthorProfile } from "./author";
import { getAudienceProfile } from "./audience";

const CURRENT_ID = "current";
const MAX_RECENT_CHANGES = 8;

function personaRef(userId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return doc(db, "users", userId, "persona", CURRENT_ID);
}

function promptsEqual(a: string, b: string) {
  return a.trim() === b.trim();
}

function serializeRecentChange(c: PersonaRecentChange) {
  return {
    summary: c.summary,
    source: c.source,
    at: c.at,
  };
}

function parseRecentChanges(raw: unknown): PersonaRecentChange[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const summary = typeof o.summary === "string" ? o.summary : "";
      const source = o.source as PersonaRecentChange["source"];
      if (!summary) return null;
      return {
        summary,
        source:
          source === "generate" ||
          source === "profile_sync" ||
          source === "feedback_sync" ||
          source === "user_refinement" ||
          source === "validate"
            ? source
            : "feedback_sync",
        at: o.at instanceof Date ? o.at : toDate(o.at),
      };
    })
    .filter((c): c is PersonaRecentChange => c !== null);
}

/** Archive current Persona before replacing prompt text. */
async function snapshotCurrentPersona(
  userId: string,
  reason: PersonaHistoryReason,
  nextPromptText?: string,
) {
  const snap = await getDoc(personaRef(userId));
  if (!snap.exists()) return;
  const d = snap.data();
  const promptText = (d.promptText as string) ?? "";
  if (!promptText.trim()) return;
  if (nextPromptText !== undefined && promptsEqual(promptText, nextPromptText)) {
    return;
  }
  await appendPersonaHistory(userId, {
    promptText,
    status: (d.status as PersonaStatus) ?? "none",
    model: (d.model as string) || undefined,
    gapQuestions: Array.isArray(d.gapQuestions)
      ? (d.gapQuestions as ProfileGapQuestion[])
      : undefined,
    reason,
  });
}

export async function getPersona(userId: string): Promise<PersonaDoc | null> {
  const snap = await getDoc(personaRef(userId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    promptText: (d.promptText as string) ?? "",
    status: (d.status as PersonaStatus) ?? "none",
    model: d.model as string | undefined,
    gapQuestions: Array.isArray(d.gapQuestions)
      ? (d.gapQuestions as ProfileGapQuestion[])
      : undefined,
    validatedAt: d.validatedAt ? toDate(d.validatedAt) : undefined,
    updatedAt: toDate(d.updatedAt),
    versionNumber:
      typeof d.versionNumber === "number" ? d.versionNumber : undefined,
    recentChanges: parseRecentChanges(d.recentChanges),
    profileFingerprint:
      typeof d.profileFingerprint === "string"
        ? d.profileFingerprint
        : undefined,
    learningSyncHash:
      typeof d.learningSyncHash === "string" ? d.learningSyncHash : undefined,
    enrichmentFingerprint:
      typeof d.enrichmentFingerprint === "string"
        ? d.enrichmentFingerprint
        : undefined,
  };
}

type CommitPersonaOptions = {
  reason: PersonaHistoryReason;
  changeSummary?: string;
  contentLanguage?: ContentLanguage;
  bumpVersion?: boolean;
  profileFingerprint?: boolean;
  learningSyncHash?: string;
  enrichmentFingerprint?: string;
  model?: string;
  gapQuestions?: ProfileGapQuestion[];
  status?: PersonaStatus;
};

/** Apply version header, optional changelog, and persist prompt text. */
export async function commitPersonaPromptUpdate(
  userId: string,
  rawPromptText: string,
  opts: CommitPersonaOptions,
): Promise<PersonaDoc | null> {
  const prev = await getPersona(userId);
  const lang =
    opts.contentLanguage ??
    (await getAuthorProfile(userId))?.contentLanguage ??
    "fr";

  const bump = opts.bumpVersion !== false;
  const versionNumber = bump
    ? (prev?.versionNumber ?? 0) + 1
    : Math.max(prev?.versionNumber ?? 1, 1);

  const updatedAt = new Date();
  const body = stripVersionHeader(rawPromptText).trim();
  const promptText = applyVersionHeader(body, versionNumber, updatedAt, lang);

  let recentChanges = [...(prev?.recentChanges ?? [])];
  const summaryText = opts.changeSummary?.trim();
  if (summaryText && summaryText !== recentChanges[0]?.summary) {
    recentChanges = [
      {
        summary: summaryText,
        source: mapReasonToSource(opts.reason),
        at: updatedAt,
      },
      ...recentChanges,
    ].slice(0, MAX_RECENT_CHANGES);
  }

  let nextFingerprint = prev?.profileFingerprint;
  if (opts.profileFingerprint) {
    const [author, audience] = await Promise.all([
      getAuthorProfile(userId),
      getAudienceProfile(userId),
    ]);
    nextFingerprint = profileFingerprint(author, audience);
  }

  await snapshotCurrentPersona(userId, opts.reason, promptText);

  await setDoc(
    personaRef(userId),
    {
      promptText,
      versionNumber,
      recentChanges: recentChanges.map(serializeRecentChange),
      profileFingerprint: nextFingerprint ?? null,
      learningSyncHash: opts.learningSyncHash ?? prev?.learningSyncHash ?? null,
      enrichmentFingerprint:
        opts.enrichmentFingerprint ?? prev?.enrichmentFingerprint ?? null,
      updatedAt: serverTimestamp(),
      ...(opts.model !== undefined ? { model: opts.model } : {}),
      ...(opts.gapQuestions !== undefined
        ? { gapQuestions: opts.gapQuestions }
        : {}),
      ...(opts.status !== undefined ? { status: opts.status } : {}),
    },
    { merge: true },
  );

  return getPersona(userId);
}

export async function savePersonaDraft(
  userId: string,
  promptText: string,
  model?: string,
  gapQuestions?: ProfileGapQuestion[],
  contentLanguage?: ContentLanguage,
) {
  const [learning, enrichment] = await Promise.all([
    getLearningProfile(userId),
    getProfileEnrichment(userId),
  ]);

  const summary =
    contentLanguage === "fr"
      ? "Persona généré ou régénéré à partir de votre profil et de vos sources."
      : contentLanguage === "es"
        ? "Persona generado o regenerado desde tu perfil y fuentes."
        : "Persona generated or regenerated from your profile and sources.";

  await commitPersonaPromptUpdate(userId, promptText, {
    reason: "generate",
    changeSummary: summary,
    contentLanguage,
    profileFingerprint: true,
    learningSyncHash: learningEntriesFingerprint(learning?.entries ?? []),
    enrichmentFingerprint: enrichmentFingerprint(enrichment?.details ?? {}),
    model,
    gapQuestions,
    status: "draft",
  });
}

/** Update prompt text only — keeps validated/draft status (for learned-preferences merge). */
export async function updatePersonaPromptText(
  userId: string,
  promptText: string,
  opts?: {
    changeSummary?: string;
    contentLanguage?: ContentLanguage;
    bumpVersion?: boolean;
    reason?: PersonaHistoryReason;
  },
) {
  await commitPersonaPromptUpdate(userId, promptText, {
    reason: opts?.reason ?? "feedback_sync",
    changeSummary: opts?.changeSummary,
    contentLanguage: opts?.contentLanguage,
    bumpVersion: opts?.bumpVersion ?? true,
  });
}

export async function validatePersona(
  userId: string,
  promptText: string,
  contentLanguage?: ContentLanguage,
) {
  const prev = await getPersona(userId);
  const summary =
    contentLanguage === "fr"
      ? "Persona validé — utilisé pour toutes les générations de posts."
      : contentLanguage === "es"
        ? "Persona validado — se usará en todas las generaciones."
        : "Persona validated — used for all post generation.";

  await commitPersonaPromptUpdate(userId, promptText, {
    reason: "validate",
    changeSummary: summary,
    contentLanguage,
    bumpVersion: prev ? !promptsEqual(prev.promptText, promptText) : true,
    status: "validated",
    gapQuestions: prev?.gapQuestions,
  });

  await setDoc(
    personaRef(userId),
    { validatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function restorePersonaFromHistory(
  userId: string,
  historyId: string,
): Promise<PersonaDoc | null> {
  const entry = await getPersonaHistoryEntry(userId, historyId);
  if (!entry) return null;

  await snapshotCurrentPersona(userId, "before_restore");

  const validatedAt =
    entry.status === "validated" ? serverTimestamp() : null;

  await setDoc(
    personaRef(userId),
    {
      promptText: entry.promptText,
      status: entry.status,
      model: entry.model ?? null,
      gapQuestions: entry.gapQuestions ?? null,
      validatedAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return getPersona(userId);
}
