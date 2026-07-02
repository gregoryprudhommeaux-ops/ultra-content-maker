"use client";

import { CreatorRadarPanel } from "@/components/articles/creation/creator-radar-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { gatherAuthorSteeringPayload } from "@/lib/profile/gather-author-steering";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getClientAuth } from "@/lib/firebase/client";
import { llmPayloadForAccess } from "@/lib/llm/client-payload";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { getPersona } from "@/lib/workspace/persona";
import { assessCreatorRadarContext } from "@/lib/creator-radar/readiness";
import {
  getCreatorRadarErrorDisplay,
  isCreatorRadarErrorCode,
  type CreatorRadarErrorCode,
} from "@/lib/creator-radar/radar-error-message";
import { addSource } from "@/lib/workspace/sources";
import type { CreatorRadarSuggestion } from "@/types/creator-radar";
import type { ContentLanguage } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  enabled?: boolean;
  personaText?: string;
  newsInterestQuery?: string;
  onInspire?: (creator: CreatorRadarSuggestion) => void;
  onKeepSuccess?: () => void;
};

export function CreatorRadarBlock({
  enabled = true,
  personaText: personaTextProp,
  newsInterestQuery = "",
  onInspire,
  onKeepSuccess,
}: Props) {
  const { user } = useAuth();
  const { access } = useSubscription();
  const locale = useLocale() as ContentLanguage;
  const tCreatorRadar = useTranslations("setup.articles.creatorRadar");

  const [personaText, setPersonaText] = useState(personaTextProp?.trim() ?? "");
  const [creators, setCreators] = useState<CreatorRadarSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CreatorRadarErrorCode | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [keepingId, setKeepingId] = useState<string | null>(null);
  const dateRef = useRef<string | null>(null);

  useEffect(() => {
    if (personaTextProp?.trim()) {
      setPersonaText(personaTextProp.trim());
      return;
    }
    if (!user) return;
    void getPersona(user.uid).then((p) => {
      setPersonaText(p?.promptText?.trim() ?? "");
    });
  }, [user, personaTextProp]);

  const loadRadar = useCallback(async (force = false) => {
    if (!user || !personaText.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!force && dateRef.current === today) return;

    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;

      const llmProfile = await getUserLlmProfile(user.uid);
      const llmPayload = llmPayloadForAccess(llmProfile, access);

      const [author, authorSteering] = await Promise.all([
        getAuthorProfile(user.uid),
        gatherAuthorSteeringPayload(user.uid, {
          newsInterestQuery: newsInterestQuery.trim() || undefined,
        }),
      ]);

      const readiness = assessCreatorRadarContext(personaText, authorSteering);
      if (!readiness.ok) {
        setCreators([]);
        setAttempted(true);
        setError(readiness.code);
        return;
      }

      const res = await fetch("/api/creator-radar/suggestions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personaExcerpt: personaText,
          contentLanguage: author?.contentLanguage ?? locale,
          authorSteering,
          newsInterestQuery: newsInterestQuery.trim() || undefined,
          llm: llmPayload,
        }),
      });
      const data = (await res.json()) as {
        creators?: CreatorRadarSuggestion[];
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        setCreators([]);
        setAttempted(true);
        const apiError = data.error ?? "load_failed";
        if (apiError === "no_llm_results" || apiError === "no_valid_creators") {
          setError("no_creators_found");
        } else if (apiError === "llm_request_failed") {
          setError("llm_request_failed");
        } else if (isCreatorRadarErrorCode(apiError)) {
          setError(apiError);
        } else {
          setError("load_failed");
        }
        return;
      }
      dateRef.current = today;
      setAttempted(true);
      setError(null);
      setCreators(data.creators ?? []);
    } catch {
      setAttempted(true);
      setError("load_failed");
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, [user, personaText, locale, newsInterestQuery, access?.effectiveTier]);

  useEffect(() => {
    if (!enabled || !user || !personaText.trim()) return;
    void loadRadar();
  }, [enabled, user, personaText, loadRadar]);

  const onKeep = useCallback(
    async (creator: CreatorRadarSuggestion) => {
      if (!user) return;
      setKeepingId(creator.id);
      try {
        await addSource(user.uid, {
          type: "linkedin_profile",
          url: creator.linkedinUrl,
          label: creator.name,
          category: "inspiration_profile",
          whyLike: creator.whyRelevant,
          likedAspects: ["angle", "approach"],
        });
        setCreators((prev) => prev.filter((c) => c.id !== creator.id));
        onKeepSuccess?.();
      } catch {
        setError("keep_failed");
      } finally {
        setKeepingId(null);
      }
    },
    [user, onKeepSuccess],
  );

  const onDismiss = useCallback(
    async (creator: CreatorRadarSuggestion) => {
      if (!user) return;
      setCreators((prev) => prev.filter((c) => c.id !== creator.id));
      try {
        const auth = getClientAuth();
        const token = auth ? await auth.currentUser?.getIdToken() : null;
        if (!token) return;
        await fetch("/api/creator-radar/dismiss", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ linkedinUrl: creator.linkedinUrl }),
        });
      } catch {
        /* local hide is enough */
      }
    },
    [user],
  );

  const errorDisplay = error
    ? getCreatorRadarErrorDisplay(tCreatorRadar, error, { tier: access?.effectiveTier })
    : null;
  const emptyDisplay =
    !error && attempted && creators.length === 0
      ? getCreatorRadarErrorDisplay(tCreatorRadar, "no_creators_found", {
          tier: access?.effectiveTier,
        })
      : null;

  if (!enabled) return null;

  if (!personaText.trim() && !loading) {
    const display = getCreatorRadarErrorDisplay(tCreatorRadar, "needs_persona");
    return (
      <CreatorRadarPanel
        creators={[]}
        error={display}
        keepingId={null}
        onKeep={() => {}}
        onInspire={() => {}}
        onDismiss={() => {}}
      />
    );
  }

  return (
    <CreatorRadarPanel
      creators={creators}
      loading={loading}
      error={errorDisplay}
      empty={emptyDisplay}
      onRetry={() => {
        dateRef.current = null;
        void loadRadar(true);
      }}
      keepingId={keepingId}
      onKeep={(c) => void onKeep(c)}
      onInspire={(c) => onInspire?.(c)}
      onDismiss={(c) => void onDismiss(c)}
    />
  );
}
