"use client";

import { DashboardPageHero } from "@/components/layout/dashboard-page";
import { CREATE_FRESH_HREF } from "@/lib/navigation/dashboard-nav";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
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
      variant="gradient"
      eyebrow={tNav("library")}
      title={t("library.title")}
      subtitle={
        isPendingView ? t("library.descriptionPending") : t("library.description")
      }
      titleExtra={<ContextHelp label={t("help.lot.label")}>{t("help.lot.body")}</ContextHelp>}
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/setup/author?tab=inspirations&from=articles"
            className={`w-full text-center sm:w-auto ${BTN_SECONDARY}`}
          >
            {t("updateInspirations")}
          </Link>
          <Link href={CREATE_FRESH_HREF} className={`w-full text-center sm:w-auto ${BTN_PRIMARY}`}>
            {t("createCta")}
          </Link>
        </div>
      }
    />
  );
}
