"use client";

import {
  buildLibraryFilterHref,
  type LibraryFilters,
  type LibraryScopeFilter,
  type LibraryStatusFilter,
} from "@/lib/articles/library-filters";
import { INPUT_CLASS } from "@/types/workspace";
import { ContextHelp } from "@/components/ui/context-help";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const STATUS_OPTIONS: LibraryStatusFilter[] = [
  "all",
  "pending",
  "draft",
  "refining",
  "validated",
];

const SCOPE_OPTIONS: LibraryScopeFilter[] = ["all", "generalist", "niche"];

type Props = {
  filters: LibraryFilters;
  onQueryChange: (query: string) => void;
  onResetQuery: () => void;
  visibleCount: number;
  totalCount: number;
};

function FilterChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-ns-primary text-black"
          : "border border-gray-200 bg-white text-ns-secondary hover:border-ns-primary/40 hover:text-ns-tertiary",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function ArticlesLibraryToolbar({
  filters,
  onQueryChange,
  onResetQuery,
  visibleCount,
  totalCount,
}: Props) {
  const t = useTranslations("setup.articles.library");
  const tHelp = useTranslations("setup.articles.help");

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.status !== "all" ||
    filters.scope !== "all";

  return (
    <section
      className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:p-5"
      aria-label={t("toolbarLabel")}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={`${INPUT_CLASS} w-full`}
          />
        </label>
        {hasActiveFilters && (
          <Link
            href={buildLibraryFilterHref("all", "all")}
            className="shrink-0 text-xs font-semibold text-ns-primary underline hover:text-ns-tertiary"
            onClick={onResetQuery}
          >
            {t("resetFilters")}
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ns-secondary">
          {t("statusLabel")}
        </p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <FilterChip
              key={status}
              active={filters.status === status}
              href={buildLibraryFilterHref(status, filters.scope)}
              label={t(`status.${status}`)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ns-secondary">
            {t("scopeLabel")}
          </p>
          <ContextHelp label={tHelp("scopeFilter.label")}>
            {tHelp("scopeFilter.body")}
          </ContextHelp>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map((scope) => (
            <FilterChip
              key={scope}
              active={filters.scope === scope}
              href={buildLibraryFilterHref(filters.status, scope)}
              label={t(`scope.${scope}`)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs font-medium text-ns-secondary">
        {t("resultsCount", { visible: visibleCount, total: totalCount })}
      </p>
    </section>
  );
}
