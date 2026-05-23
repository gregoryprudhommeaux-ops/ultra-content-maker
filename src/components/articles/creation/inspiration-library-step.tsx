"use client";

import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import type { SourceLink } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";

type Props = {
  sources: SourceLink[];
  selectedId: string | null;
  onSelect: (source: SourceLink) => void;
  excerpt: string;
  onExcerptChange: (excerpt: string) => void;
  onContinue: () => void;
};

export function InspirationLibraryStep({
  sources,
  selectedId,
  onSelect,
  excerpt,
  onExcerptChange,
  onContinue,
}: Props) {
  const t = useTranslations("setup.articles.create.inspiration");
  const tInsp = useTranslations("setup.inspirations");

  const selected = sources.find((s) => s.id === selectedId) ?? null;

  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-ns-tertiary">{t("libraryTitle")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("libraryHint")}</p>
      </div>

      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {sources.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s)}
              className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                selectedId === s.id
                  ? "border-2 border-ns-primary bg-ns-brand-light/40"
                  : "border-gray-100 hover:border-ns-primary/40"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-ns-secondary">
                {s.category === "inspiration_profile"
                  ? t("profileBadge")
                  : t("postBadge")}
              </p>
              <p className="mt-1 font-medium text-ns-tertiary truncate">
                {s.label || s.url}
              </p>
              {s.likedAspects && s.likedAspects.length > 0 && (
                <p className="mt-1 text-xs text-ns-secondary">
                  {s.likedAspects
                    .map((a) => tInsp(`aspects.${a}`))
                    .join(" · ")}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="rounded-lg border border-gray-100 bg-ns-brand-light/30 p-3 text-sm">
          <p className="text-xs font-medium text-ns-secondary">{t("selectedLabel")}</p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block font-medium text-ns-primary underline truncate"
          >
            {selected.label || selected.url}
          </a>
        </div>
      )}

      <div>
        <label className={LABEL_CLASS} htmlFor="library-excerpt">
          {t("optionalExcerptLabel")}
        </label>
        <textarea
          id="library-excerpt"
          rows={6}
          value={excerpt}
          onChange={(e) => onExcerptChange(e.target.value)}
          placeholder={t("optionalExcerptPlaceholder")}
          className={`${INPUT_CLASS} mt-1 font-mono text-sm`}
        />
        <p className="mt-1 text-xs text-ns-secondary">{t("optionalExcerptHelp")}</p>
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={onContinue}
        className={`${BTN_PRIMARY} disabled:opacity-50`}
      >
        {t("continueToBrief")}
      </button>
    </section>
  );
}
