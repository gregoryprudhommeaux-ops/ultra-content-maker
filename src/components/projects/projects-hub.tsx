"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  contentProjectCardTone,
  formatContentProjectDate,
} from "@/lib/projects/content-project";
import {
  createContentProject,
  deleteContentProject,
  listContentProjects,
} from "@/lib/workspace/content-projects";
import { BTN_PRIMARY, META_LABEL, SECTION_TITLE } from "@/lib/ui/nextstep";
import type { ContentProject } from "@/types/workspace";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export function ProjectsHub() {
  const t = useTranslations("projects");
  const locale = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setProjects(await listContentProjects(user.uid));
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!user || creating) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createContentProject(user.uid, {
        name: t("defaultName"),
      });
      router.push(`/projects/${project.id}`);
    } catch {
      setError(t("createFailed"));
      setCreating(false);
    }
  }

  async function onDelete(id: string) {
    if (!user) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await deleteContentProject(user.uid, id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError(t("deleteFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={META_LABEL}>{t("eyebrow")}</p>
          <h1 className={`${SECTION_TITLE} mt-1`}>{t("title")}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ns-secondary">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          disabled={creating || !user}
          onClick={() => void onCreate()}
          className={`${BTN_PRIMARY} shrink-0 disabled:opacity-50`}
        >
          {creating ? t("creating") : t("createNew")}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ns-secondary">{t("loading")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            disabled={creating || !user}
            onClick={() => void onCreate()}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ns-alternate bg-ns-surface/50 px-4 py-6 text-sm font-semibold text-ns-tertiary hover:border-ns-primary/50 disabled:opacity-50"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-800">
              +
            </span>
            {t("createCard")}
          </button>

          {projects.length === 0 && (
            <div className="flex min-h-[140px] flex-col justify-center rounded-2xl border border-ns-alternate/60 bg-white px-4 py-6 sm:col-span-1 lg:col-span-2">
              <p className="text-sm font-semibold text-ns-tertiary">{t("emptyTitle")}</p>
              <p className="mt-1 text-xs leading-relaxed text-ns-secondary">
                {t("emptyHint")}
              </p>
            </div>
          )}

          {projects.map((project) => {
            const tone = contentProjectCardTone(project.colorIndex);
            const ideaCount = project.ideas?.length ?? 0;
            const msgCount = project.chat?.length ?? 0;
            return (
              <div
                key={project.id}
                className={`relative flex min-h-[140px] flex-col rounded-2xl ${tone.bg} p-4 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="text-lg" aria-hidden>
                      {project.emoji || "🎯"}
                    </span>
                    <h2 className={`mt-2 line-clamp-2 text-base font-bold ${tone.accent}`}>
                      {project.name}
                    </h2>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onDelete(project.id)}
                    className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ns-secondary hover:bg-black/5 hover:text-red-700"
                    aria-label={t("delete")}
                  >
                    {t("delete")}
                  </button>
                </div>
                <p className={`mt-auto pt-4 text-xs ${tone.accent} opacity-70`}>
                  {formatContentProjectDate(project.updatedAt, locale)}
                  {" · "}
                  {t("metaIdeas", { count: ideaCount })}
                  {" · "}
                  {t("metaMessages", { count: msgCount })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
