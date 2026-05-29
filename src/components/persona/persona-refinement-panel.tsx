"use client";

import { ButtonSpinner } from "@/components/ui/generating-indicator";
import { refreshPersonaFromProfile } from "@/lib/persona/refresh-persona-from-profile";
import { isInvalidApiKeyError } from "@/lib/llm/parse-json";
import type { ContentLanguage } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  userId: string;
  contentLanguage: ContentLanguage;
  disabled?: boolean;
  onUpdated: (promptText: string) => void;
};

export function PersonaRefinementPanel({
  userId,
  contentLanguage,
  disabled,
  onUpdated,
}: Props) {
  const t = useTranslations("setup.persona.refinement");
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onApply() {
    const trimmed = comment.trim();
    if (!trimmed) return;
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const result = await refreshPersonaFromProfile(
        userId,
        contentLanguage,
        trimmed,
      );
      if (!result.ok) {
        if (result.error === "no_llm") {
          setError(t("noLlmKey"));
        } else if (isInvalidApiKeyError(result.detail ?? "")) {
          setError(t("invalidApiKey"));
        } else {
          setError(t("failed"));
        }
        return;
      }
      setComment("");
      setSuccess(result.changeSummary || t("applied"));
      onUpdated(result.promptText);
    } catch {
      setError(t("failed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        disabled={disabled || pending}
        placeholder={t("placeholder")}
        className="w-full rounded-lg border border-ns-alternate bg-white p-3 text-sm text-ns-tertiary leading-relaxed disabled:opacity-50"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || pending || comment.trim().length < 10}
          onClick={onApply}
          className="inline-flex items-center gap-2 rounded-sm bg-ns-tertiary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-ns-tertiary/90 disabled:opacity-50"
        >
          {pending && <ButtonSpinner className="border-white/40 border-t-white" />}
          {pending ? t("applying") : t("apply")}
        </button>
      </div>
      {success && <p className="text-sm text-emerald-800">{success}</p>}
      {error && (
        <div className="space-y-1">
          <p className="text-sm text-red-600">{error}</p>
          {(error === t("noLlmKey") || error === t("invalidApiKey")) && (
            <Link href="/setup/llm" className="text-sm font-medium text-ns-tertiary underline">
              → {t("goLlmSetup")}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
