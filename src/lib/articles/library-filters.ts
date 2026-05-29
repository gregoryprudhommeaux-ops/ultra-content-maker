import { resolveArticleScope } from "@/lib/articles/scope";
import type { ArticleDoc, ArticleScope, ArticleStatus } from "@/types/workspace";

export type LibraryStatusFilter = "all" | "pending" | ArticleStatus;
export type LibraryScopeFilter = "all" | ArticleScope;

export type LibraryFilters = {
  query: string;
  status: LibraryStatusFilter;
  scope: LibraryScopeFilter;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  query: "",
  status: "all",
  scope: "all",
};

const STATUS_FILTERS: LibraryStatusFilter[] = [
  "all",
  "pending",
  "draft",
  "refining",
  "validated",
];

const SCOPE_FILTERS: LibraryScopeFilter[] = ["all", "generalist", "niche"];

export function parseLibraryStatusFilter(value: string | null): LibraryStatusFilter {
  if (value && STATUS_FILTERS.includes(value as LibraryStatusFilter)) {
    return value as LibraryStatusFilter;
  }
  return "all";
}

export function parseLibraryScopeFilter(value: string | null): LibraryScopeFilter {
  if (value && SCOPE_FILTERS.includes(value as LibraryScopeFilter)) {
    return value as LibraryScopeFilter;
  }
  return "all";
}

/** Read filters from URL search params (supports legacy ?pending=1). */
export function libraryFiltersFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): Pick<LibraryFilters, "status" | "scope"> {
  const legacyPending = params.get("pending") === "1";
  const statusParam = params.get("status");
  const status =
    statusParam != null
      ? parseLibraryStatusFilter(statusParam)
      : legacyPending
        ? "pending"
        : "all";

  return {
    status,
    scope: parseLibraryScopeFilter(params.get("scope")),
  };
}

function articleSearchBlob(article: ArticleDoc): string {
  return [
    article.hook,
    article.body,
    article.ps,
    article.postBrief?.problem,
    article.postBrief?.pointOfView,
    article.postBrief?.proof,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function articleMatchesLibraryFilters(
  article: ArticleDoc,
  filters: LibraryFilters,
): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q && !articleSearchBlob(article).includes(q)) {
    return false;
  }

  if (filters.status === "pending") {
    if (article.status === "validated") return false;
  } else if (filters.status !== "all" && article.status !== filters.status) {
    return false;
  }

  if (filters.scope !== "all" && resolveArticleScope(article) !== filters.scope) {
    return false;
  }

  return true;
}

export function countArticles(batches: { articles: ArticleDoc[] }[]): number {
  return batches.reduce((sum, batch) => sum + batch.articles.length, 0);
}

export function buildLibraryFilterHref(
  status: LibraryStatusFilter,
  scope: LibraryScopeFilter,
): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (scope !== "all") params.set("scope", scope);
  const qs = params.toString();
  return qs ? `/articles?${qs}` : "/articles";
}
