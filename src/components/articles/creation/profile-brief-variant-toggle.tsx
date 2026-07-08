import { FORM_SUBSECTION_TITLE } from "@/lib/ui/nextstep";

import { useTranslations } from "next-intl";

export type ProfileBriefVariant = "quick" | "full";

type Props = {
  value: ProfileBriefVariant;
  onChange: (value: ProfileBriefVariant) => void;
};

export function ProfileBriefVariantToggle({ value, onChange }: Props) {
  const t = useTranslations("setup.articles.create.profileBrief");

  return (
    <div className="rounded-xl border border-gray-100 bg-ns-brand-light/40 p-4">
      <p className={FORM_SUBSECTION_TITLE}>{t("toggleTitle")}</p>
      <p className="mt-1 text-xs text-ns-secondary">{t("toggleHint")}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(["quick", "full"] as const).map((variant) => {
          const selected = value === variant;
          return (
            <button
              key={variant}
              type="button"
              onClick={() => onChange(variant)}
              className={[
                "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                selected
                  ? "border-ns-primary bg-white font-semibold text-ns-tertiary shadow-sm ring-2 ring-ns-primary/20"
                  : "border-gray-200 bg-white/70 text-ns-secondary hover:border-ns-primary/40",
              ].join(" ")}
            >
              <span className="block font-semibold">{t(`variants.${variant}.title`)}</span>
              <span className="mt-0.5 block text-xs font-normal text-ns-secondary">
                {t(`variants.${variant}.desc`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
