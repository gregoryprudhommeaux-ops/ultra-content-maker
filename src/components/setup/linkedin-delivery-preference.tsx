"use client";

import { OptionalLabel } from "@/components/setup/optional-label";
import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { AuthorProfile } from "@/types/workspace";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";

export type LinkedInDeliveryMode = NonNullable<AuthorProfile["linkedInDeliveryMode"]>;

type Props = {
  mode: LinkedInDeliveryMode;
  notes: string;
  onModeChange: (mode: LinkedInDeliveryMode) => void;
  onNotesChange: (notes: string) => void;
};

export function LinkedInDeliveryPreference({
  mode,
  notes,
  onModeChange,
  onNotesChange,
}: Props) {
  const t = useTranslations("setup.express.linkedInDelivery");

  return (
    <div className="space-y-4 rounded-xl border border-ns-primary/20 bg-ns-primary/5 p-4">
      <div>
        <h3 className={FORM_SUBSECTION_TITLE}>{t("title")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">{t("title")}</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ns-border bg-white p-3">
          <input
            type="radio"
            name="linkedInDeliveryMode"
            checked={mode === "agency_publish"}
            onChange={() => onModeChange("agency_publish")}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-ns-tertiary">{t("agencyPublish")}</span>
            <span className="mt-0.5 block text-xs text-ns-secondary">{t("agencyPublishHint")}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ns-border bg-white p-3">
          <input
            type="radio"
            name="linkedInDeliveryMode"
            checked={mode === "client_copy_paste"}
            onChange={() => onModeChange("client_copy_paste")}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-ns-tertiary">{t("clientCopyPaste")}</span>
            <span className="mt-0.5 block text-xs text-ns-secondary">{t("clientCopyPasteHint")}</span>
          </span>
        </label>
      </fieldset>

      {mode === "agency_publish" ? (
        <div>
          <OptionalLabel htmlFor="linkedin-access-notes" optional>
            {t("accessNotes")}
          </OptionalLabel>
          <p className="mb-2 text-xs text-ns-secondary">{t("accessNotesHint")}</p>
          <ImeSafeTextarea
            id="linkedin-access-notes"
            rows={3}
            value={notes}
            onValueChange={onNotesChange}
            placeholder={t("accessNotesPlaceholder")}
            className={`${INPUT_CLASS} resize-y`}
          />
        </div>
      ) : null}
    </div>
  );
}
