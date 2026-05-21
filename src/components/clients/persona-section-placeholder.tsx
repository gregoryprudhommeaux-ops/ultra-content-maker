"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Section = "brain" | "generate" | "history";

type Props = {
  personaId: string;
  section: Section;
};

export function PersonaSectionPlaceholder({ personaId, section }: Props) {
  const t = useTranslations("client.hub");
  const tSection = useTranslations(`client.sections.${section}`);
  const tCommon = useTranslations("common");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link
        href={`/clients/${personaId}`}
        className="text-sm text-ns-secondary hover:text-ns-tertiary"
      >
        {t("backToPersona")}
      </Link>
      <div className="rounded-2xl border border-gray-100 bg-ns-surface p-8 text-center">
        <h1 className="text-xl font-semibold text-ns-tertiary">{t(section)}</h1>
        <p className="mt-2 text-sm font-medium text-amber-700">{tCommon("comingSoon")}</p>
        <p className="mt-4 text-sm text-ns-secondary">{tSection("description")}</p>
        <Link
          href={`/clients/${personaId}`}
          className="mt-6 inline-block text-sm font-medium text-ns-tertiary underline"
        >
          {tSection("backCta")}
        </Link>
      </div>
    </div>
  );
}
