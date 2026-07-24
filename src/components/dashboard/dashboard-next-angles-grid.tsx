"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { Link } from "@/i18n/navigation";
import { META_LABEL } from "@/lib/ui/nextstep";
import {
  balanceAnglesByPillar,
  dismissEditorialAngle,
  listQueuedEditorialAngles,
  type EditorialAngleDoc,
  type EditorialAnglePillar,
} from "@/lib/workspace/editorial-angles";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

function angleHref(angle: EditorialAngleDoc): string {
  const params = new URLSearchParams({
    mode: "profile",
    problem: angle.title.slice(0, 280),
    pointOfView: angle.angle.slice(0, 500),
    angleId: angle.id,
  });
  return `/articles/new?${params.toString()}`;
}

const PILLAR_ORDER: EditorialAnglePillar[] = [
  "market",
  "expertise",
  "build_in_public",
];

export function DashboardNextAnglesGrid() {
  const t = useTranslations("dashboard.nextAngles");
  const tPillar = useTranslations("setup.articles.create.interview.pack.pillar");
  const { user } = useAuth();
  const { scope } = useWorkspace();
  const workspaceOwnerId = scope?.ownerId ?? user?.uid ?? "";
  const [angles, setAngles] = useState<EditorialAngleDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!workspaceOwnerId) return;
    try {
      const queued = await listQueuedEditorialAngles(workspaceOwnerId);
      setAngles(balanceAnglesByPillar(queued, 2));
    } catch {
      setAngles([]);
    } finally {
      setLoaded(true);
    }
  }, [workspaceOwnerId]);

  useEffect(() => {
    void reload();
  }, [reload, scope?.accountId]);

  const byPillar = useMemo(() => {
    const map: Record<EditorialAnglePillar, EditorialAngleDoc[]> = {
      market: [],
      expertise: [],
      build_in_public: [],
    };
    for (const a of angles) {
      map[a.pillar].push(a);
    }
    return map;
  }, [angles]);

  if (!loaded || angles.length === 0) return null;

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-5 shadow-sm">
      <p className={META_LABEL}>{t("eyebrow")}</p>
      <h2 className="mt-1 text-base font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("hint")}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PILLAR_ORDER.map((pillar) => {
          const items = byPillar[pillar];
          if (items.length === 0) return null;
          return (
            <div key={pillar} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
                {tPillar(pillar)}
              </p>
              <ul className="space-y-2">
                {items.map((angle) => (
                  <li
                    key={angle.id}
                    className="rounded-xl border border-white/80 bg-white px-3 py-3 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-ns-tertiary">{angle.title}</p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-ns-secondary">
                      {angle.angle}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={angleHref(angle)}
                        className="text-xs font-semibold text-ns-tertiary underline"
                      >
                        {t("useCta")}
                      </Link>
                      <button
                        type="button"
                        className="text-xs font-medium text-ns-secondary underline"
                        onClick={() => {
                          void dismissEditorialAngle(workspaceOwnerId, angle.id).then(() =>
                            reload(),
                          );
                        }}
                      >
                        {t("dismiss")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
