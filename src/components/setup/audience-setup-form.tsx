"use client";

import { EmojiLevelPicker } from "@/components/articles/emoji-level-picker";
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
import { Link, useRouter } from "@/i18n/navigation";
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
    if (!user) return;
    setPending(true);
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
      await saveDefaultEmojiLevel(user.uid, emojiLevel);
      await updateSetupStep(user.uid, "persona");
      notifyOnboardingProgressChanged();
      router.push("/persona");
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await goToPersona(false);
  }

  return (
    <div className="space-y-8">
      <Link href="/setup/author" className="text-sm text-ns-secondary hover:text-ns-tertiary">
        {t("back")}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <form onSubmit={onSubmit} className="max-w-xl space-y-4">
        <div>
          <OptionalLabel htmlFor="target">{t("targetLabel")}</OptionalLabel>
          <input
            id="target"
            value={targetLabel}
            onChange={(e) => setTargetLabel(e.target.value)}
            placeholder={t("targetPlaceholder")}
            className={INPUT_CLASS}
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
          />
        </div>

        <p className="text-xs text-ns-secondary">{t("optionalNote")}</p>

        <div className="rounded-xl border border-gray-100 bg-ns-brand-light p-4">
          <p className="mb-3 text-sm font-medium text-ns-tertiary">{t("emojiIntro")}</p>
          <EmojiLevelPicker value={emojiLevel} onChange={setEmojiLevel} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => goToPersona(true)}
            className="rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
          >
            {t("skip")}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
          >
            {t("continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
