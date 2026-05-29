"use client";

import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import type { LibraryStatusFilter } from "@/lib/articles/library-filters";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  statusFilter: LibraryStatusFilter;
};

export function ArticlesHubHeader({ statusFilter }: Props) {
  const t = useTranslations("setup.articles");

  const isPendingView = statusFilter === "pending";

  return (
    <section className="rounded-2xl border border-gray-100 bg-ns-surface shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-end md:px-6">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/setup/author?tab=inspirations&from=articles"
            className="w-full rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-center text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light sm:w-auto"
          >
            {t("updateInspirations")}
          </Link>
          <Link href="/articles/new" className={`w-full shrink-0 sm:w-auto ${BTN_PRIMARY}`}>
            {t("createCta")}
          </Link>
        </div>
      </div>

      <header className="px-4 py-5 md:px-6 md:py-6">
        <h1 className="text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl">
          {t("library.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
          {isPendingView ? t("library.descriptionPending") : t("library.description")}
        </p>
      </header>
    </section>
  );
}
