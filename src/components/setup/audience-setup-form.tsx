"use client";

import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
import {
  ButtonSpinner,
  GeneratingIndicator,
} from "@/components/ui/generating-indicator";
import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { useAuth } from "@/components/auth/auth-provider";
import { getAudienceProfile, saveAudienceProfile, skipAudienceStep } from "@/lib/workspace/audience";
import {
  getLearningProfile,
  saveDefaultEmojiLevel,
} from "@/lib/workspace/learning-profile";
import { updateSetupStep } from "@/lib/workspace/user";
import type { EmojiLevel } from "@/types/workspace";
import { OptionalLabel } from "@/components/setup/optional-label";
import { INPUT_CLASS } from "@/types/workspace";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

export function AudienceSetupForm() {
  const t = useTranslations("setup.audience");
  const { user } = useAuth();
  const router = useRouter();
  const [targetLabel, setTargetLabel] = useState("");
  const [contentFocus, setContentFocus] = useState("");
  const [optionalNotes, setOptionalNotes] = useState("");
  const [emojiLevel, setEmojiLevel] = useState<EmojiLevel>("light");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"idle" | "save" | "sync" | "done">(
    "idle",
  );

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      getAudienceProfile(user.uid),
      getLearningProfile(user.uid),
    ]).then(([audience, learning]) => {
      if (audience) {
        setTargetLabel(audience.targetLabel ?? "");
        setContentFocus(audience.contentFocus ?? "");
        setOptionalNotes(audience.optionalNotes ?? "");
      }
      if (learning?.emojiLevel) setEmojiLevel(learning.emojiLevel);
    });
  }, [user]);

  async function goToPersona(skipped: boolean) {
    if (!user || pending) return;
    setPending(true);
    setPendingPhase("save");
    setError(null);
    try {
      if (skipped) {
        await skipAudienceStep(user.uid);
      } else {
        await saveAudienceProfile(user.uid, {
          targetLabel: targetLabel.trim() || undefined,
          contentFocus: contentFocus.trim() || undefined,
          optionalNotes: optionalNotes.trim() || undefined,
          skipped: false,
        });
      }
      setPendingPhase("sync");
      const author = await import("@/lib/workspace/author").then((m) =>
        m.getAuthorProfile(user.uid),
      );
      await saveDefaultEmojiLevel(
        user.uid,
        emojiLevel,
        author?.contentLanguage ?? "fr",
      );
      setPendingPhase("done");
      await updateSetupStep(user.uid, "persona");
      notifyOnboardingProgressChanged();
      router.push("/persona");
    } catch {
      setError(t("saveFailed"));
      setPendingPhase("idle");
      setPending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await goToPersona(false);
  }

  return (
    <div className="space-y-8">
      <OnboardingStepBanner stepKey="audience" />
      <div>
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>
        <p className="mt-2 inline-flex rounded-full border border-ns-alternate bg-ns-brand-light px-2.5 py-0.5 text-xs font-semibold text-ns-secondary">
          {t("stepBadge")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="max-w-xl space-y-4" aria-busy={pending}>
        <div>
          <OptionalLabel htmlFor="target">{t("targetLabel")}</OptionalLabel>
          <input
            id="target"
            value={targetLabel}
            onChange={(e) => setTargetLabel(e.target.value)}
            placeholder={t("targetPlaceholder")}
            className={INPUT_CLASS}
            disabled={pending}
          />
        </div>
        <div>
          <OptionalLabel htmlFor="focus">{t("contentFocus")}</OptionalLabel>
          <textarea
            id="focus"
            rows={3}
            value={contentFocus}
            onChange={(e) => setContentFocus(e.target.value)}
            placeholder={t("focusPlaceholder")}
            className={INPUT_CLASS}
            disabled={pending}
          />
        </div>
        <div>
          <OptionalLabel htmlFor="notes">{t("notes")}</OptionalLabel>
          <textarea
            id="notes"
            rows={2}
            value={optionalNotes}
            onChange={(e) => setOptionalNotes(e.target.value)}
            className={INPUT_CLASS}
            disabled={pending}
          />
        </div>

        <p className="text-xs text-ns-secondary">{t("optionalNote")}</p>

        <div
          className={`rounded-xl border border-gray-100 bg-ns-brand-light p-4 ${pending ? "pointer-events-none opacity-60" : ""}`}
        >
          <p className="mb-3 text-sm font-medium text-ns-tertiary">{t("emojiIntro")}</p>
          <EmojiLevelPicker value={emojiLevel} onChange={setEmojiLevel} />
        </div>

        {pending && (
          <GeneratingIndicator
            label={
              pendingPhase === "sync"
                ? t("syncingPersona")
                : pendingPhase === "done"
                  ? t("openingPersona")
                  : t("savingProfile")
            }
            hint={t("syncingPersonaHint")}
            className="max-w-xl"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => goToPersona(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
          >
            {pending ? <ButtonSpinner className="border-ns-alternate border-t-zinc-800" /> : null}
            {pending ? t("skipPending") : t("skip")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-w-[12rem] items-center justify-center gap-2 rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-70"
          >
            {pending && <ButtonSpinner />}
            {pending ? t("continuePending") : t("continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
