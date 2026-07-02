"use client";

import { CreatorRadarBlock } from "@/components/articles/creation/creator-radar-block";
import { stashRadarInspire } from "@/lib/creator-radar/radar-inspire-session";
import type { CreatorRadarSuggestion } from "@/types/creator-radar";
import { INSPIRATION_ASPECTS, type InspirationAspect } from "@/lib/inspiration/aspects";
import {
  inferInspirationFromUrl,
  normalizeSourceUrl,
} from "@/lib/inspiration/infer-from-url";
import {
  addSource,
  listSources,
  removeSource,
} from "@/lib/workspace/sources";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { MyPostsLinksEditor } from "@/components/setup/my-posts-links-editor";
import { OptionalLabel } from "@/components/setup/optional-label";
import { useWorkspace } from "@/contexts/workspace-context";
import { INPUT_CLASS } from "@/types/workspace";
import type { SourceLink } from "@/types/workspace";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  userId: string;
  showMyPosts?: boolean;
  showPersonaHint?: boolean;
  hidePageHeader?: boolean;
  returnHref?: string;
  returnLabel?: string;
};

const INSPIRATION_CATEGORIES = new Set(["inspiration_post", "inspiration_profile"]);

function aspectLabel(
  t: ReturnType<typeof useTranslations<"setup.inspirations">>,
  aspect: InspirationAspect,
) {
  return t(`aspects.${aspect}`);
}

function UnifiedInspirationSection({
  userId,
  refreshToken = 0,
}: {
  userId: string;
  refreshToken?: number;
}) {
  const t = useTranslations("setup.inspirations");
  const { scope } = useWorkspace();
  const [sources, setSources] = useState<SourceLink[]>([]);
  const [url, setUrl] = useState("");
  const [whyLike, setWhyLike] = useState("");
  const [aspects, setAspects] = useState<InspirationAspect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const inferred = useMemo(() => {
    if (!url.trim() || !isValidUrl(url.trim())) return null;
    return inferInspirationFromUrl(url);
  }, [url]);

  const load = useCallback(async (fromServer = false) => {
    setLoading(true);
    try {
      const all = await listSources(userId, { fromServer });
      setSources(
        all
          .filter((s) => INSPIRATION_CATEGORIES.has(s.category))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load, scope?.accountId, refreshToken]);

  function toggleAspect(a: InspirationAspect) {
    setAspects((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  }

  async function onAdd() {
    setError(null);
    setSuccess(false);
    if (!url.trim()) return;
    if (!isValidUrl(url.trim())) {
      setError(t("invalidUrl"));
      return;
    }

    const kind = inferInspirationFromUrl(url);
    if (!kind) {
      setError(t("invalidLinkedInUrl"));
      return;
    }

    if (aspects.length === 0 && !whyLike.trim()) {
      setError(t("needAspectOrWhy"));
      return;
    }

    const normalized = normalizeSourceUrl(url);
    if (sources.some((s) => normalizeSourceUrl(s.url) === normalized)) {
      setError(t("duplicateUrl"));
      return;
    }

    setPending(true);
    try {
      await addSource(userId, {
        type: kind.type,
        url: url.trim(),
        category: kind.category,
        likedAspects: aspects.length ? aspects : undefined,
        whyLike: whyLike.trim() || undefined,
      });
      setUrl("");
      setWhyLike("");
      setAspects([]);
      setSuccess(true);
      await load(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "duplicate_url") setError(t("duplicateUrl"));
      else if (msg === "max_sources_per_category") setError(t("maxReached"));
      else setError(t("addFailed"));
    } finally {
      setPending(false);
    }
  }

  async function onRemove(id: string) {
    if (removingId) return;
    setError(null);
    setRemovingId(id);
    const previous = sources;
    setSources((current) => current.filter((s) => s.id !== id));
    try {
      await removeSource(userId, id);
      await load(true);
    } catch {
      setSources(previous);
      setError(t("removeFailed"));
    } finally {
      setRemovingId(null);
    }
  }

  const count = sources.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-ns-brand-light/40 px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-ns-tertiary">{t("unifiedTitle")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ns-secondary">
              {t("unifiedDescription")}
            </p>
          </div>
          {!loading && count > 0 && (
            <span className="rounded-full bg-ns-primary/15 px-3 py-1 text-xs font-semibold text-ns-tertiary">
              {t("count", { count })}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 py-4 md:px-6">
        {loading ? (
          <p className="text-sm text-ns-secondary">…</p>
        ) : count > 0 ? (
          <ul className="space-y-2">
            {sources.map((s, index) => {
              const isProfile = s.category === "inspiration_profile";
              return (
                <li
                  key={s.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm ${
                    isProfile
                      ? "border-sky-100 border-l-4 border-l-sky-400"
                      : "border-violet-100 border-l-4 border-l-violet-400"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isProfile
                            ? "bg-sky-50 text-sky-800"
                            : "bg-violet-50 text-violet-800"
                        }`}
                      >
                        {isProfile ? t("typeProfile") : t("typePost")}
                      </span>
                      <span className="text-[10px] font-medium text-ns-secondary/70">
                        #{index + 1}
                      </span>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 block truncate font-medium text-ns-tertiary underline"
                    >
                      {s.label || s.url}
                    </a>
                    {s.likedAspects && s.likedAspects.length > 0 && (
                      <p className="mt-1.5 text-xs text-ns-secondary">
                        {t("liked")}:{" "}
                        {s.likedAspects.map((a) => aspectLabel(t, a)).join(" · ")}
                      </p>
                    )}
                    {s.whyLike && (
                      <p className="mt-1 text-xs italic leading-relaxed text-ns-secondary">
                        {s.whyLike}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={removingId === s.id}
                    onClick={() => void onRemove(s.id)}
                    className="shrink-0 text-xs font-medium text-ns-secondary hover:text-red-600 disabled:opacity-50"
                  >
                    {t("remove")}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-ns-alternate bg-ns-brand-light/30 px-4 py-6 text-center">
            <p className="text-sm font-medium text-ns-tertiary">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-ns-secondary">{t("empty")}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-ns-brand-light/20 p-4 md:p-5">
          <p className="text-sm font-semibold text-ns-tertiary">
            {count > 0 ? t("addAnotherTitle") : t("addFirstTitle")}
          </p>
          <p className="mt-1 text-xs text-ns-secondary">{t("addFormHint")}</p>

          <div className="mt-4 space-y-4">
            <div>
              <OptionalLabel htmlFor="inspiration-url" optional={false}>
                {t("url")}
              </OptionalLabel>
              <input
                id="inspiration-url"
                type="text"
                inputMode="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void onAdd();
                  }
                }}
                placeholder={t("urlPlaceholder")}
                className={INPUT_CLASS}
              />
              {inferred && (
                <p className="mt-1.5 text-xs font-medium text-ns-primary">
                  {inferred.category === "inspiration_profile"
                    ? t("typeDetectedProfile")
                    : t("typeDetectedPost")}
                </p>
              )}
              {url.trim() && isValidUrl(url.trim()) && !inferred && (
                <p className="mt-1.5 text-xs text-amber-700">{t("invalidLinkedInUrl")}</p>
              )}
            </div>

            <fieldset>
              <legend className="mb-1 text-sm font-medium text-ns-tertiary">
                {t("aspectsLabel")}
              </legend>
              <p className="mb-2 text-xs leading-relaxed text-ns-secondary">
                {t("aspectsHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                {INSPIRATION_ASPECTS.map((a) => {
                  const on = aspects.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAspect(a)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? "border-ns-primary bg-ns-primary/20 text-ns-tertiary"
                          : "border-ns-alternate bg-white text-ns-secondary hover:border-ns-primary/50"
                      }`}
                    >
                      {aspectLabel(t, a)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <OptionalLabel htmlFor="inspiration-why">{t("whyOptional")}</OptionalLabel>
              <ImeSafeTextarea
                id="inspiration-why"
                rows={2}
                value={whyLike}
                onValueChange={setWhyLike}
                placeholder={t("whyPlaceholder")}
                className={INPUT_CLASS}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && (
              <p className="text-sm font-medium text-emerald-800">{t("addedSuccess")}</p>
            )}

            <button
              type="button"
              disabled={pending || !url.trim()}
              onClick={() => void onAdd()}
              className="rounded-lg bg-ns-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
            >
              {pending ? "…" : count > 0 ? t("addAnother") : t("add")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function InspirationsEditor({
  userId,
  showMyPosts = false,
  showPersonaHint = true,
  hidePageHeader = false,
  returnHref,
  returnLabel,
}: Props) {
  const t = useTranslations("setup.inspirations");
  const router = useRouter();
  const [sourcesRefresh, setSourcesRefresh] = useState(0);

  const onRadarInspire = useCallback(
    (creator: CreatorRadarSuggestion) => {
      stashRadarInspire(creator);
      router.push("/articles/new?mode=inspiration");
    },
    [router],
  );

  return (
    <div className="space-y-6">
      {!hidePageHeader ? (
        <div className="space-y-4">
          {returnHref && returnLabel ? (
            <Link
              href={returnHref}
              className="inline-block text-sm font-medium text-ns-secondary hover:text-ns-tertiary"
            >
              {returnLabel}
            </Link>
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold text-ns-tertiary">{t("pageTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ns-secondary">
              {t("pageSubtitle")}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("embeddedTitle")}</h3>
          <p className="mt-1 text-sm text-ns-secondary">{t("embeddedSubtitle")}</p>
        </div>
      )}

      <details className="rounded-xl border border-ns-alternate bg-white p-4 open:shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-ns-tertiary">
          {t("guide.title")}
        </summary>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-ns-secondary">
          <div>
            <h4 className="font-medium text-ns-tertiary">{t("guide.postTitle")}</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("guide.postStep1")}</li>
              <li>{t("guide.postStep2")}</li>
              <li>{t("guide.postStep3")}</li>
              <li>{t("guide.postStep4")}</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-ns-tertiary">{t("guide.profileTitle")}</h4>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>{t("guide.profileStep1")}</li>
              <li>{t("guide.profileStep2")}</li>
              <li>{t("guide.profileStep3")}</li>
            </ol>
          </div>
          <p className="rounded-lg bg-ns-brand-light/60 px-3 py-2 text-xs">{t("guide.tip")}</p>
        </div>
      </details>

      {showMyPosts && <MyPostsLinksEditor userId={userId} />}

      <CreatorRadarBlock
        onInspire={onRadarInspire}
        onKeepSuccess={() => setSourcesRefresh((v) => v + 1)}
      />

      <UnifiedInspirationSection userId={userId} refreshToken={sourcesRefresh} />

      {showPersonaHint && (
        <p className="rounded-xl border border-ns-alternate bg-ns-brand-light/80 px-4 py-3 text-sm leading-relaxed text-ns-secondary">
          {t("personaHint")}{" "}
          <Link href="/setup/persona" className="font-medium text-ns-tertiary underline">
            {t("personaLink")}
          </Link>
        </p>
      )}
    </div>
  );
}
