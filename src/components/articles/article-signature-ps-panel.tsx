"use client";

import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { buildDefaultSignaturePs } from "@/lib/articles/signature-ps";
import type { AuthorProfile, ContentLanguage } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  contentLanguage: ContentLanguage;
  currentPs?: string;
  author?: Pick<
    AuthorProfile,
    "roleTitle" | "positioningLine" | "signaturePs" | "contentLanguage"
  > | null;
  displayName?: string;
  disabled?: boolean;
  onChange: (ps: string | undefined) => void | Promise<void>;
  onSaveTemplate?: (signaturePs: string) => void | Promise<void>;
};

export function ArticleSignaturePsPanel({
  contentLanguage,
  currentPs,
  author,
  displayName,
  disabled,
  onChange,
  onSaveTemplate,
}: Props) {
  const t = useTranslations("setup.articles.signaturePs");
  const defaultText = buildDefaultSignaturePs({
    contentLanguage,
    displayName,
    roleTitle: author?.roleTitle,
    positioningLine: author?.positioningLine,
    savedSignaturePs: author?.signaturePs,
  });

  const hasCurrent = Boolean(currentPs?.trim());
  const [enabled, setEnabled] = useState(hasCurrent);
  const [draft, setDraft] = useState(currentPs?.trim() || defaultText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextHas = Boolean(currentPs?.trim());
    setEnabled(nextHas);
    if (nextHas) {
      setDraft(currentPs!.trim());
    } else if (!draft.trim()) {
      setDraft(defaultText);
    }
    // Only sync when article PS or author template changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPs, author?.signaturePs, defaultText]);

  async function applyEnabled(next: boolean) {
    setEnabled(next);
    setSaving(true);
    try {
      if (!next) {
        await onChange(undefined);
        return;
      }
      const text = draft.trim() || defaultText;
      setDraft(text);
      await onChange(text || undefined);
      if (text && onSaveTemplate) {
        await onSaveTemplate(text);
      }
    } finally {
      setSaving(false);
    }
  }

  async function applyDraft() {
    if (!enabled) return;
    setSaving(true);
    try {
      const text = draft.trim();
      await onChange(text || undefined);
      if (text && onSaveTemplate) {
        await onSaveTemplate(text);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-ns-alternate/70 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`${LABEL_CLASS} mb-0`}>{t("title")}</p>
          <p className="mt-1 text-xs leading-relaxed text-ns-secondary">{t("hint")}</p>
        </div>
        <label className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-ns-tertiary">
          <input
            type="checkbox"
            className="size-4 rounded border-gray-300 text-ns-primary focus:ring-ns-primary"
            checked={enabled}
            disabled={disabled || saving}
            onChange={(e) => void applyEnabled(e.target.checked)}
          />
          {t("toggle")}
        </label>
      </div>

      {enabled && (
        <div className="space-y-2">
          <label className={LABEL_CLASS} htmlFor="article-signature-ps">
            {t("textLabel")}
          </label>
          <ImeSafeTextarea
            id="article-signature-ps"
            rows={3}
            value={draft}
            disabled={disabled || saving}
            onValueChange={setDraft}
            onBlur={() => void applyDraft()}
            className={INPUT_CLASS}
            placeholder={t("placeholder")}
          />
          <button
            type="button"
            disabled={disabled || saving || !draft.trim()}
            onClick={() => void applyDraft()}
            className="text-xs font-semibold text-ns-tertiary underline hover:text-ns-primary disabled:opacity-50"
          >
            {saving ? t("saving") : t("apply")}
          </button>
        </div>
      )}
    </div>
  );
}
