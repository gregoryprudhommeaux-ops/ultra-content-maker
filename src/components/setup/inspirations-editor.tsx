"use client";

import { INSPIRATION_ASPECTS, type InspirationAspect } from "@/lib/inspiration/aspects";
import {
  addSource,
  listSourcesByCategory,
  removeSource,
} from "@/lib/workspace/sources";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { MyPostsLinksEditor } from "@/components/setup/my-posts-links-editor";
import { OptionalLabel } from "@/components/setup/optional-label";
import { INPUT_CLASS } from "@/types/workspace";
import type { SourceCategory } from "@/types/workspace";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  userId: string;
  showMyPosts?: boolean;
  showPersonaHint?: boolean;
  hidePageHeader?: boolean;
  returnHref?: string;
  returnLabel?: string;
};

function aspectLabel(
  t: ReturnType<typeof useTranslations<"setup.inspirations">>,
  aspect: InspirationAspect,
) {
  return t(`aspects.${aspect}`);
}

function SourceList({
  sources,
  onRemove,
  t,
  tAspects,
}: {
  sources: Awaited<ReturnType<typeof listSourcesByCategory>>;
  onRemove: (id: string) => void;
  t: ReturnType<typeof useTranslations<"setup.inspirations">>;
  tAspects: ReturnType<typeof useTranslations<"setup.inspirations">>;
}) {
  return (
    <ul className="space-y-2">
      {sources.map((s, index) => (
        <li
          key={s.id}
          className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
              #{index + 1}
            </p>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block truncate font-medium text-ns-tertiary underline"
            >
              {s.label || s.url}
            </a>
            {s.likedAspects && s.likedAspects.length > 0 && (
              <p className="mt-1 text-xs text-ns-secondary">
                {t("liked")}:{" "}
                {s.likedAspects.map((a) => tAspects(`aspects.${a}`)).join(" · ")}
              </p>
            )}
            {s.whyLike && (
              <p className="mt-1 text-xs italic text-ns-secondary">{s.whyLike}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(s.id)}
            className="shrink-0 text-xs font-medium text-ns-secondary hover:text-red-600"
          >
            {t("remove")}
          </button>
        </li>
      ))}
    </ul>
  );
}

function InspirationSection({
  userId,
  category,
  titleKey,
  descKey,
  urlPlaceholderKey,
}: {
  userId: string;
  category: Extract<SourceCategory, "inspiration_post" | "inspiration_profile">;
  titleKey: "postsTitle" | "profilesTitle";
  descKey: "postsDescription" | "profilesDescription";
  urlPlaceholderKey: "postUrlPlaceholder" | "profileUrlPlaceholder";
}) {
  const t = useTranslations("setup.inspirations");
  const [sources, setSources] = useState<Awaited<ReturnType<typeof listSourcesByCategory>>>([]);
  const [url, setUrl] = useState("");
  const [whyLike, setWhyLike] = useState("");
  const [aspects, setAspects] = useState<InspirationAspect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSources(await listSourcesByCategory(userId, category));
    } finally {
      setLoading(false);
    }
  }, [userId, category]);

  useEffect(() => {
    load();
  }, [load]);

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
    if (aspects.length === 0 && !whyLike.trim()) {
      setError(t("needAspectOrWhy"));
      return;
    }
    setPending(true);
    try {
      await addSource(userId, {
        type: category === "inspiration_profile" ? "linkedin_profile" : "linkedin_post",
        url: url.trim(),
        category,
        likedAspects: aspects.length ? aspects : undefined,
        whyLike: whyLike.trim() || undefined,
      });
      setUrl("");
      setWhyLike("");
      setAspects([]);
      setSuccess(true);
      await load();
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

  const count = sources.length;

  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-ns-brand-light/50 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ns-tertiary">{t(titleKey)}</h3>
          <p className="mt-1 text-sm text-ns-secondary">{t(descKey)}</p>
        </div>
        {!loading && count > 0 && (
          <span className="rounded-full bg-ns-primary/20 px-2.5 py-0.5 text-xs font-bold text-ns-tertiary">
            {t("count", { count })}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ns-secondary">…</p>
      ) : count > 0 ? (
        <SourceList
          sources={sources}
          onRemove={(id) => removeSource(userId, id).then(load)}
          t={t}
          tAspects={t}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-ns-alternate bg-white/60 px-3 py-4 text-sm text-ns-secondary">
          {t("empty")}
        </p>
      )}

      <div className="space-y-3 border-t border-ns-alternate/80 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
          {count > 0 ? t("addAnotherTitle") : t("addFirstTitle")}
        </p>

        <div>
          <OptionalLabel htmlFor={`${category}-url`}>{t("url")}</OptionalLabel>
          <input
            id={`${category}-url`}
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
            placeholder={t(urlPlaceholderKey)}
            className={INPUT_CLASS}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ns-tertiary">
            {t("aspectsLabel")}
          </legend>
          <p className="mb-2 text-xs text-ns-secondary">{t("aspectsHint")}</p>
          <div className="flex flex-wrap gap-2">
            {INSPIRATION_ASPECTS.map((a) => {
              const on = aspects.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAspect(a)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
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
          <OptionalLabel htmlFor={`${category}-why`}>{t("whyOptional")}</OptionalLabel>
          <textarea
            id={`${category}-why`}
            rows={2}
            value={whyLike}
            onChange={(e) => setWhyLike(e.target.value)}
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
          disabled={pending}
          onClick={onAdd}
          className="rounded-lg border border-ns-alternate bg-white px-4 py-2.5 text-sm font-medium text-ns-tertiary shadow-sm hover:bg-ns-brand-light disabled:opacity-50"
        >
          {pending ? "…" : count > 0 ? t("addAnother") : t("add")}
        </button>
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
            <p className="mt-2 text-sm text-ns-secondary">{t("pageSubtitle")}</p>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="text-sm font-semibold text-ns-tertiary">{t("embeddedTitle")}</h3>
          <p className="mt-1 text-sm text-ns-secondary">
            {t("embeddedSubtitle")}{" "}
            <Link
              href="/setup/author?tab=inspirations"
              className="font-medium text-ns-tertiary underline"
            >
              {t("embeddedManageLink")}
            </Link>
          </p>
        </div>
      )}

      <details className="rounded-xl border border-ns-alternate bg-white p-4 open:shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-ns-tertiary">
          {t("guide.title")}
        </summary>
        <div className="mt-4 space-y-4 text-sm text-ns-secondary">
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
          <p className="text-xs">{t("guide.tip")}</p>
        </div>
      </details>

      {showMyPosts && <MyPostsLinksEditor userId={userId} />}

      <InspirationSection
        userId={userId}
        category="inspiration_post"
        titleKey="postsTitle"
        descKey="postsDescription"
        urlPlaceholderKey="postUrlPlaceholder"
      />

      <InspirationSection
        userId={userId}
        category="inspiration_profile"
        titleKey="profilesTitle"
        descKey="profilesDescription"
        urlPlaceholderKey="profileUrlPlaceholder"
      />

      {showPersonaHint && (
        <p className="rounded-lg border border-ns-alternate bg-ns-brand-light/80 px-4 py-3 text-sm text-ns-secondary">
          {t("personaHint")}{" "}
          <Link href="/setup/persona" className="font-medium text-ns-tertiary underline">
            {t("personaLink")}
          </Link>
        </p>
      )}
    </div>
  );
}
