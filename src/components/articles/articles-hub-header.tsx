"use client";

import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const SEGMENT_SHELL =
  "inline-flex w-full max-w-md rounded-lg border border-ns-alternate bg-ns-brand-light p-1 sm:w-auto";
const SEGMENT_ACTIVE =
  "flex-1 rounded-md bg-ns-surface px-4 py-2 text-center text-sm font-semibold text-ns-tertiary shadow-sm sm:flex-none";
const SEGMENT_IDLE =
  "flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-ns-secondary transition-colors hover:text-ns-tertiary sm:flex-none";

type Props = {
  pendingOnly: boolean;
};

export function ArticlesHubHeader({ pendingOnly }: Props) {
  const t = useTranslations("setup.articles");

  return (
    <section className="rounded-2xl border border-gray-100 bg-ns-surface shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div
          className={SEGMENT_SHELL}
          role="tablist"
          aria-label={t("filter.label")}
        >
          <Link
            href="/articles?pending=1"
            role="tab"
            aria-selected={pendingOnly}
            className={pendingOnly ? SEGMENT_ACTIVE : SEGMENT_IDLE}
          >
            {t("filter.pending")}
          </Link>
          <Link
            href="/articles"
            role="tab"
            aria-selected={!pendingOnly}
            className={!pendingOnly ? SEGMENT_ACTIVE : SEGMENT_IDLE}
          >
            {t("filter.all")}
          </Link>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/setup/inspirations"
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
          {pendingOnly ? t("titlePending") : t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
          {pendingOnly ? t("descriptionPending") : t("descriptionList")}
        </p>
      </header>
    </section>
  );
}
