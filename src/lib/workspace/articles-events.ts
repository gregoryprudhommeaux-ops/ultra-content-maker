const ARTICLES_CHANGED_EVENT = "articles-changed";

/** Refresh sidebar / library lists after an article is saved. */
export function notifyArticlesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ARTICLES_CHANGED_EVENT));
  }
}

export function notifyArticlesChangedDeferred(ms = 500) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => notifyArticlesChanged(), ms);
}

export { ARTICLES_CHANGED_EVENT };
