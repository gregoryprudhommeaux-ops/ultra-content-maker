"use client";

import { DashboardPageHero } from "@/components/layout/dashboard-page";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import type { LibraryStatusFilter } from "@/lib/articles/library-filters";
import { ContextHelp } from "@/components/ui/context-help";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  statusFilter: LibraryStatusFilter;
};

export function ArticlesHubHeader({ statusFilter }: Props) {
  const t = useTranslations("setup.articles");
  const tNav = useTranslations("nav");

  const isPendingView = statusFilter === "pending";

  return (
    <DashboardPageHero
      variant="card"
      eyebrow={tNav("library")}
      title={t("library.title")}
      subtitle={isPendingView ? t("library.descriptionPending") : t("library.description")}
      titleExtra={<ContextHelp label={t("help.lot.label")}>{t("help.lot.body")}</ContextHelp>}
      toolbar={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/setup/author?tab=inspirations&from=articles"
            className="w-full rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-center text-sm font-semibold text-ns-tertiary hover:border-ns-primary hover:bg-ns-brand-light sm:w-auto"
          >
            {t("updateInspirations")}
          </Link>
          <Link href={CREATE_FRESH_HREF} className={`w-full shrink-0 sm:w-auto ${BTN_PRIMARY}`}>
            {t("createCta")}
          </Link>
        </div>
      }
    />
  );
}
