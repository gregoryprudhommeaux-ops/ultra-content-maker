"use client";

import { NewsCard } from "@/components/news/news-card";
import { OnboardingBlockedBanner } from "@/components/onboarding/onboarding-blocked-banner";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useAuth } from "@/components/auth/auth-provider";
import {
  listArchivedNews,
  type ArchivedNewsDoc,
} from "@/lib/workspace/news-archive";
import { getPersona } from "@/lib/workspace/persona";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ContentLanguage } from "@/types/workspace";
import { useCallback, useEffect, useState } from "react";

/** Read-only archive; creation happens in /articles/new */
export function NewsArchiveList() {
  const t = useTranslations("setup.news");
  const locale = useLocale() as ContentLanguage;
  const { user, loading: authLoading } = useAuth();
  const [personaOk, setPersonaOk] = useState<boolean | null>(null);
  const [archived, setArchived] = useState<ArchivedNewsDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    const [p, items] = await Promise.all([
      getPersona(user.uid),
      listArchivedNews(user.uid),
    ]);
    setPersonaOk(!!p?.validatedAt && !!p?.promptText?.trim());
    setArchived(items);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    reload().catch(() => setLoaded(true));
  }, [user, authLoading, reload]);

  if (!loaded) {
    return <GeneratingIndicator label="…" className="max-w-xl" />;
  }

  if (!personaOk) {
    return <OnboardingBlockedBanner reason="persona" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <Link
          href="/articles/new?mode=news"
          className="text-sm text-ns-secondary hover:text-ns-tertiary"
        >
          ← {t("backToWizard")}
        </Link>
        <h1 className="text-2xl font-bold text-ns-tertiary">{t("title")}</h1>
        <p className="text-sm text-ns-secondary">{t("subtitleArchive")}</p>
      </header>

      {archived.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm text-ns-secondary">{t("empty")}</p>
          <Link href="/articles/new?mode=news" className={`mt-4 inline-block ${BTN_PRIMARY}`}>
            {t("scanFreshNews")}
          </Link>
        </div>
      )}

      {archived.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {archived.map((item) => (
            <li key={item.id}>
              <NewsCard
                item={item}
                selected={false}
                onClick={() => {}}
                onRead={() => window.open(item.url, "_blank", "noopener,noreferrer")}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ns-secondary">{t("archiveHint")}</p>
    </div>
  );
}
