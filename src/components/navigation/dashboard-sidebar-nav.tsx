"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useOnboardingProgress } from "@/contexts/onboarding-progress-context";
import {
  isLastPostPath,
  SIDEBAR_QUICK_LINKS,
  type SidebarQuickLinkKey,
} from "@/lib/navigation/dashboard-sidebar";
import { dashboardNavNeedsAttention } from "@/lib/navigation/dashboard-nav";
import { listRecentArticles } from "@/lib/workspace/articles";
import { META_LABEL } from "@/lib/ui/nextstep";
import type { ArticleDoc } from "@/types/workspace";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

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
  const { progress } = useOnboardingProgress();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const [lastPost, setLastPost] = useState<ArticleDoc | null>(null);
  const [lastPostLoading, setLastPostLoading] = useState(false);

  const canCreate = progress?.canAccessCreation ?? false;
  const voiceNeedsAttention = dashboardNavNeedsAttention("profile", progress);

  useEffect(() => {
    if (!user) {
      setLastPost(null);
      return;
    }
    setLastPostLoading(true);
    void listRecentArticles(user.uid, 1)
      .then((articles) => setLastPost(articles[0] ?? null))
      .finally(() => setLastPostLoading(false));
  }, [user, pathname]);

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
            onClick={onNavigate}
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
            {link.key === "libraryDrafts" && (
              <span className="mt-0.5 block text-[10px] font-medium leading-snug text-white/50">
                {t("libraryHint")}
              </span>
            )}
          </Link>
        );
      })}

      {lastPostLoading ? (
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
    </nav>
  );
}
