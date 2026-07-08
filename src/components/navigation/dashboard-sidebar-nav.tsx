"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  isLastPostPath,
  SIDEBAR_QUICK_LINKS,
  type SidebarQuickLinkKey,
} from "@/lib/navigation/dashboard-sidebar";
import { dashboardNavNeedsAttention, isCreationHubPath } from "@/lib/navigation/dashboard-nav";
import { dispatchCreationFreshStart } from "@/lib/articles/creation-wizard-session";
import { ARTICLES_CHANGED_EVENT } from "@/lib/workspace/articles-events";
import {
  listRecentDraftArticles,
  listRecentValidatedArticles,
  SIDEBAR_DRAFTS_PREVIEW,
} from "@/lib/workspace/articles";
import { META_LABEL } from "@/lib/ui/nextstep";
import type { ArticleDoc } from "@/types/workspace";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

const ONBOARDING_PROGRESS_CHANGED = "onboarding-progress-changed";

function sidebarLinkClass(active: boolean, variant: "default" | "primary" | "muted" = "default") {
  if (variant === "muted") {
    return "rounded-lg px-3 py-2.5 text-sm text-white/40 cursor-default";
  }
  if (variant === "primary") {
    return `block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
      active
        ? "bg-ns-primary/20 text-ns-primary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.4)]"
        : "bg-ns-primary/10 text-ns-primary hover:bg-ns-primary/20"
    }`;
  }
  return `block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? "bg-ns-primary/15 text-ns-primary shadow-[inset_0_0_0_1px_rgba(157,196,26,0.35)]"
      : "text-white/85 hover:bg-white/5 hover:text-ns-primary"
  }`;
}

type Props = {
  onNavigate?: () => void;
  className?: string;
};

export function DashboardSidebarNav({ onNavigate, className = "" }: Props) {
  const t = useTranslations("nav.sidebar");
  const { user } = useAuth();
  const { scope } = useWorkspace();
  const { progress } = useOnboardingProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const [lastPost, setLastPost] = useState<ArticleDoc | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<ArticleDoc[]>([]);
  const [sidebarArticlesLoading, setSidebarArticlesLoading] = useState(false);

  const canCreate = progress?.canAccessCreation ?? false;
  const voiceNeedsAttention = dashboardNavNeedsAttention("profile", progress);

  const loadSidebarArticles = useCallback(async () => {
    if (!user) {
      setLastPost(null);
      setRecentDrafts([]);
      return;
    }
    setSidebarArticlesLoading(true);
    try {
      const [validated, drafts] = await Promise.all([
        listRecentValidatedArticles(user.uid, 1),
        listRecentDraftArticles(user.uid, SIDEBAR_DRAFTS_PREVIEW),
      ]);
      setLastPost(validated[0] ?? null);
      setRecentDrafts(drafts);
    } finally {
      setSidebarArticlesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSidebarArticles();
  }, [loadSidebarArticles, pathname, scope?.accountId]);

  useEffect(() => {
    const refresh = () => void loadSidebarArticles();
    window.addEventListener(ONBOARDING_PROGRESS_CHANGED, refresh);
    window.addEventListener(ARTICLES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(ONBOARDING_PROGRESS_CHANGED, refresh);
      window.removeEventListener(ARTICLES_CHANGED_EVENT, refresh);
    };
  }, [loadSidebarArticles]);

  function hrefFor(key: SidebarQuickLinkKey): string {
    if (key === "createNewPost" && !canCreate) return "/start";
    return SIDEBAR_QUICK_LINKS.find((l) => l.key === key)?.href ?? "/";
  }

  function renderLinkLabel(key: SidebarQuickLinkKey) {
    return t(key);
  }

  const lastPostActive =
    lastPost != null && isLastPostPath(pathname, lastPost.id);
  const lastPostTitle =
    lastPost?.hook?.trim() || t("lastPostUntitled");

  function draftTitle(article: ArticleDoc): string {
    return article.hook?.trim() || t("lastPostUntitled");
  }

  function handleQuickLinkClick(
    e: MouseEvent<HTMLAnchorElement>,
    key: SidebarQuickLinkKey,
  ) {
    if (key === "createNewPost" && isCreationHubPath(pathname)) {
      e.preventDefault();
      dispatchCreationFreshStart();
    }
    onNavigate?.();
  }

  return (
    <nav
      className={`flex flex-col gap-1 px-3 py-4 ${className}`}
      aria-label={t("ariaLabel")}
    >
      <p className={`${META_LABEL} mb-2 px-2 text-white/45`}>{t("title")}</p>

      {SIDEBAR_QUICK_LINKS.map((link) => {
        const active = link.isActive(pathname, statusParam);
        const isPrimary = link.key === "createNewPost";
        return (
          <Link
            key={link.key}
            href={hrefFor(link.key)}
            className={sidebarLinkClass(active, isPrimary ? "primary" : "default")}
            aria-current={active ? "page" : undefined}
            onClick={(e) => handleQuickLinkClick(e, link.key)}
          >
            <span className="block">
              {renderLinkLabel(link.key)}
              {link.key === "updateVoice" && voiceNeedsAttention && (
                <span
                  className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ns-primary align-middle"
                  aria-hidden
                />
              )}
            </span>
            {link.key === "createNewPost" && (
              <span className="mt-0.5 block text-[10px] font-medium leading-snug text-white/50">
                {t("createHint")}
              </span>
            )}
            {link.key === "dashboard" && (
              <span className="mt-0.5 block text-[10px] font-medium leading-snug text-white/50">
                {t("dashboardHint")}
              </span>
            )}
            {link.key === "libraryDrafts" && (
              <span className="mt-0.5 block text-[10px] font-medium leading-snug text-white/50">
                {t("libraryHint")}
              </span>
            )}
          </Link>
        );
      })}

      <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
        {sidebarArticlesLoading ? (
          <span className={sidebarLinkClass(false, "muted")}>…</span>
        ) : lastPost ? (
          <Link
            href={`/articles/${lastPost.id}`}
            className={sidebarLinkClass(lastPostActive)}
            aria-current={lastPostActive ? "page" : undefined}
            onClick={onNavigate}
          >
            <span className="block">{t("lastPost")}</span>
            <span className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-white/50">
              {lastPostTitle}
            </span>
          </Link>
        ) : (
          <span className={sidebarLinkClass(false, "muted")}>
            <span className="block">{t("lastPost")}</span>
            <span className="mt-0.5 block text-[10px] font-medium leading-snug">
              {t("lastPostEmpty")}
            </span>
          </span>
        )}

        <div className="space-y-1">
          <p className={`${META_LABEL} px-2 text-white/45`}>{t("lastDrafts")}</p>
          {sidebarArticlesLoading ? (
            <span className={sidebarLinkClass(false, "muted")}>…</span>
          ) : recentDrafts.length > 0 ? (
            recentDrafts.map((draft) => {
              const active = isLastPostPath(pathname, draft.id);
              return (
                <Link
                  key={draft.id}
                  href={`/articles/${draft.id}`}
                  className={sidebarLinkClass(active)}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <span className="line-clamp-2 text-[10px] font-medium leading-snug text-white/50">
                    {draftTitle(draft)}
                  </span>
                </Link>
              );
            })
          ) : (
            <span className={sidebarLinkClass(false, "muted")}>
              <span className="block text-[10px] font-medium leading-snug">
                {t("lastDraftsEmpty")}
              </span>
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
