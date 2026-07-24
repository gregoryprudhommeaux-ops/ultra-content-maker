"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { useWorkspace } from "@/contexts/workspace-context";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import { getClientAuth } from "@/lib/firebase/client";
import { llmPayloadForTier } from "@/lib/llm/client-payload";
import {
  parseVoiceFingerprint,
  voiceFingerprintPatch,
  type VoiceFingerprint,
} from "@/lib/persona/voice-fingerprint";
import { BTN_PRIMARY, BTN_SECONDARY, FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { getAuthorProfile } from "@/lib/workspace/author";
import { getProfileEnrichment, saveProfileEnrichment } from "@/lib/workspace/enrichment";
import { listValidatedArticles } from "@/lib/workspace/articles";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { INPUT_CLASS } from "@/types/workspace";
import type { ContentLanguage } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  userId: string;
  contentLanguage?: ContentLanguage;
};

type Slot = { text: string; label: string };

const EMPTY_SLOTS: Slot[] = [
  { text: "", label: "" },
  { text: "", label: "" },
  { text: "", label: "" },
];

function articleText(a: { exportText?: string; hook?: string; body?: string }): string {
  if (a.exportText?.trim()) return a.exportText.trim();
  const hook = a.hook?.trim() ?? "";
  const body = a.body?.trim() ?? "";
  return [hook, body].filter(Boolean).join("\n\n");
}

export function VoiceFingerprintPanel({ userId, contentLanguage }: Props) {
  const t = useTranslations("setup.author.voiceFingerprint");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const { scope } = useWorkspace();
  const { access } = useSubscription();
  const formatError = useFormatUserError();

  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [fingerprint, setFingerprint] = useState<VoiceFingerprint | null>(null);
  const [validatedOptions, setValidatedOptions] = useState<
    { id: string; label: string; text: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filledCount = slots.filter((s) => s.text.trim().length >= 40).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enrichment, articles] = await Promise.all([
        getProfileEnrichment(userId),
        listValidatedArticles(userId).catch(() => []),
      ]);
      setFingerprint(parseVoiceFingerprint(enrichment?.details));
      setValidatedOptions(
        articles
          .slice(0, 12)
          .map((a) => {
            const text = articleText(a);
            if (text.length < 40) return null;
            const label =
              a.hook?.trim().slice(0, 80) ||
              text.slice(0, 80) ||
              a.id;
            return { id: a.id, label, text };
          })
          .filter((x): x is { id: string; label: string; text: string } => !!x),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, scope?.accountId]);

  function updateSlot(index: number, patch: Partial<Slot>) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function fillFromValidated(articleId: string, slotIndex: number) {
    const opt = validatedOptions.find((o) => o.id === articleId);
    if (!opt) return;
    updateSlot(slotIndex, { text: opt.text, label: opt.label });
  }

  async function analyze() {
    if (!user || analyzing || filledCount < 2) return;
    setAnalyzing(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) {
        setError(
          formatError({
            errorCode: "Unauthorized",
            fallbackMessage: t("analyzeFailed"),
          }).message,
        );
        return;
      }

      const [author, llmProfile] = await Promise.all([
        getAuthorProfile(userId),
        getUserLlmProfile(user.uid),
      ]);

      const posts = slots
        .map((s) => s.text.trim())
        .filter((p) => p.length >= 40)
        .slice(0, 3);
      const sourceLabels = slots
        .filter((s) => s.text.trim().length >= 40)
        .map((s) => s.label.trim())
        .filter(Boolean)
        .slice(0, 3);

      const res = await fetch("/api/persona/voice-fingerprint", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          posts,
          sourceLabels: sourceLabels.length ? sourceLabels : undefined,
          contentLanguage: contentLanguage ?? author?.contentLanguage ?? locale,
          llm: llmPayloadForTier(llmProfile, access?.effectiveTier),
        }),
      });
      const data = (await res.json()) as {
        fingerprint?: VoiceFingerprint;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !data.fingerprint) {
        setError(
          formatError({
            errorCode: data.error,
            fallbackMessage: data.detail ?? t("analyzeFailed"),
          }).message,
        );
        return;
      }

      setSaving(true);
      await saveProfileEnrichment(userId, voiceFingerprintPatch(data.fingerprint));
      setFingerprint(data.fingerprint);
    } catch (e) {
      setError(
        formatError({
          errorCode: "unknown",
          fallbackMessage: e instanceof Error ? e.message : t("analyzeFailed"),
        }).message,
      );
    } finally {
      setAnalyzing(false);
      setSaving(false);
    }
  }

  async function clearFingerprint() {
    setSaving(true);
    setError(null);
    try {
      await saveProfileEnrichment(userId, voiceFingerprintPatch(null));
      setFingerprint(null);
      setSlots(EMPTY_SLOTS);
    } catch (e) {
      setError(
        formatError({
          errorCode: "unknown",
          fallbackMessage: e instanceof Error ? e.message : t("clearFailed"),
        }).message,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ns-secondary">{t("subtitle")}</p>
      </div>

      {fingerprint ? (
        <div className="space-y-2 rounded-lg border border-gray-100 bg-white px-3 py-3 text-sm">
          <p className="font-medium text-ns-tertiary">{t("savedTitle")}</p>
          {fingerprint.summary ? (
            <p className="text-ns-secondary">{fingerprint.summary}</p>
          ) : null}
          <ul className="space-y-1 text-xs text-ns-secondary">
            {fingerprint.rhythm ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("rhythm")}: </span>
                {fingerprint.rhythm}
              </li>
            ) : null}
            {fingerprint.hooks ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("hooks")}: </span>
                {fingerprint.hooks}
              </li>
            ) : null}
            {fingerprint.posture ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("posture")}: </span>
                {fingerprint.posture}
              </li>
            ) : null}
            {fingerprint.lexicalTics.length > 0 ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("lexicalTics")}: </span>
                {fingerprint.lexicalTics.join(" · ")}
              </li>
            ) : null}
            {fingerprint.preserveMarkers.length > 0 ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("preserve")}: </span>
                {fingerprint.preserveMarkers.join(" · ")}
              </li>
            ) : null}
            {fingerprint.avoidList.length > 0 ? (
              <li>
                <span className="font-medium text-ns-tertiary">{t("avoid")}: </span>
                {fingerprint.avoidList.join(" · ")}
              </li>
            ) : null}
          </ul>
          {fingerprint.analyzedAt ? (
            <p className="text-[10px] text-ns-secondary">
              {t("analyzedAt", {
                date: new Date(fingerprint.analyzedAt).toLocaleString(),
              })}
            </p>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => void clearFingerprint()}
            className={`${BTN_SECONDARY} mt-1 text-xs`}
          >
            {t("clear")}
          </button>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-xs font-medium text-ns-tertiary">{t("pasteTitle")}</p>
        {slots.map((slot, index) => (
          <div key={index} className="space-y-1.5">
            <label className="text-xs text-ns-secondary" htmlFor={`voice-fp-${index}`}>
              {t("postN", { n: index + 1 })}
            </label>
            <textarea
              id={`voice-fp-${index}`}
              rows={4}
              value={slot.text}
              onChange={(e) => updateSlot(index, { text: e.target.value })}
              placeholder={t("placeholder")}
              className={`${INPUT_CLASS} min-h-[5.5rem] resize-y text-sm`}
            />
            {validatedOptions.length > 0 ? (
              <select
                className={`${INPUT_CLASS} text-xs`}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) fillFromValidated(id, index);
                }}
              >
                <option value="">{t("pickValidated")}</option>
                {validatedOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={analyzing || saving || filledCount < 2}
          onClick={() => void analyze()}
          className={BTN_PRIMARY}
        >
          {analyzing || saving ? t("analyzing") : t("analyze")}
        </button>
        <span className="text-xs text-ns-secondary">
          {t("filledHint", { count: filledCount })}
          {validatedOptions.length > 0
            ? ` · ${t("hasValidated", { count: validatedOptions.length })}`
            : ""}
        </span>
      </div>
    </div>
  );
}
