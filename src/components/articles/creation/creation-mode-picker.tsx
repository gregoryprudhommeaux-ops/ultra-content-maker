"use client";

import { CreationStrategyGuidePanel } from "@/components/articles/creation/creation-strategy-guide";
import { RecentPostsSection } from "@/components/articles/creation/recent-posts-section";
import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { META_LABEL, SECTION_TITLE } from "@/lib/ui/nextstep";
import type { ArticleDoc, CreationStrategyTheme } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

type ModeId = WizardCreationMode;

type GuideKey = "regular" | "news" | "repurpose";

const GUIDE_TO_MODE: Record<GuideKey, ModeId> = {
  regular: "profile",
  news: "news",
  repurpose: "inspiration",
};

type ModeConfig = {
  id: ModeId;
  accent: "lime" | "sky" | "violet";
  featured?: boolean;
};

const MODES: ModeConfig[] = [
  { id: "profile", accent: "lime", featured: true },
  { id: "news", accent: "sky" },
  { id: "inspiration", accent: "violet" },
];

const ACCENT = {
  lime: {
    ring: "ring-ns-primary/40",
    border: "border-ns-primary/30",
    borderHover: "hover:border-ns-primary",
    bg: "bg-ns-primary/10",
    icon: "text-ns-primary",
    badge: "bg-ns-primary text-black",
    gradient: "from-ns-primary/20 via-ns-primary/5 to-transparent",
    dot: "bg-ns-primary",
  },
  sky: {
    ring: "ring-sky-400/40",
    border: "border-sky-200/80",
    borderHover: "hover:border-sky-400",
    bg: "bg-sky-50",
    icon: "text-sky-700",
    badge: "bg-sky-600 text-white",
    gradient: "from-sky-100/80 via-sky-50/50 to-transparent",
    dot: "bg-sky-500",
  },
  violet: {
    ring: "ring-violet-400/40",
    border: "border-violet-200/80",
    borderHover: "hover:border-violet-400",
    bg: "bg-violet-50",
    icon: "text-violet-800",
    badge: "bg-violet-700 text-white",
    gradient: "from-violet-100/80 via-violet-50/50 to-transparent",
    dot: "bg-violet-500",
  },
} as const;

function ModeIcon({ mode, className }: { mode: ModeId; className?: string }) {
  const cn = className ?? "h-7 w-7";
  if (mode === "profile") {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M17 4l2 2m0-2-2 2"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (mode === "news") {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 6h16M4 10h16M4 14h10M4 18h6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }
  return (
    <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 6h11M8 12h11M8 18h7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M4 6v12M4 6l-2 2m2-2 2 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  personaText: string;
  onSelect: (mode: ModeId) => void;
  onApplyTheme?: (theme: CreationStrategyTheme, mode: ModeId) => void;
  onReworkArticle?: (article: ArticleDoc) => void;
  reworkArticleId?: string | null;
};

export function CreationModePicker({
  personaText,
  onSelect,
  onApplyTheme,
  onReworkArticle,
  reworkArticleId,
}: Props) {
  const t = useTranslations("setup.articles.create.modePicker");
  const [guideHighlight, setGuideHighlight] = useState<ModeId | null>(null);
  const [pulseMode, setPulseMode] = useState<ModeId | null>(null);
  const modeCardRefs = useRef<Partial<Record<ModeId, HTMLButtonElement | null>>>({});

  const focusCreationMode = useCallback((mode: ModeId) => {
    setGuideHighlight(mode);
    setPulseMode(mode);
    window.setTimeout(() => setPulseMode(null), 2400);
    requestAnimationFrame(() => {
      modeCardRefs.current[mode]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, []);

  const guideOptions: { key: GuideKey; label: string }[] = [
    { key: "regular", label: t("guide.regular") },
    { key: "news", label: t("guide.news") },
    { key: "repurpose", label: t("guide.repurpose") },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-ns-brand-light via-white to-white p-6 shadow-sm md:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ns-primary/15 blur-3xl"
          aria-hidden
        />
        <p className={META_LABEL}>{t("heroEyebrow")}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-black uppercase tracking-tighter text-ns-tertiary md:text-3xl">
          {t("heroTitle")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary md:text-base">
          {t("heroSubtitle")}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {[t("heroPill1"), t("heroPill2"), t("heroPill3")].map((pill) => (
            <li
              key={pill}
              className="rounded-full border border-ns-primary/25 bg-white/80 px-3 py-1 text-xs font-semibold text-ns-tertiary backdrop-blur-sm"
            >
              {pill}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-2xl border border-dashed border-ns-alternate/80 bg-ns-brand-light/60 p-5 md:p-6"
        aria-labelledby="creation-guide-title"
      >
        <div className="flex flex-wrap items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ns-hero text-lg text-ns-primary"
            aria-hidden
          >
            ?
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="creation-guide-title" className={SECTION_TITLE}>
              {t("guide.title")}
            </h3>
            <p className="mt-1 text-sm font-medium text-ns-secondary">{t("guide.subtitle")}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {guideOptions.map((opt) => {
            const mode = GUIDE_TO_MODE[opt.key];
            const active = guideHighlight === mode;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => focusCreationMode(mode)}
                className={[
                  "rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-all",
                  active
                    ? "border-ns-primary bg-white text-ns-tertiary shadow-md ring-2 ring-ns-primary/25"
                    : "border-gray-200 bg-white/70 text-ns-secondary hover:border-ns-primary/50 hover:bg-white hover:text-ns-tertiary",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {guideHighlight && (
          <p className="mt-3 text-sm font-medium text-ns-tertiary">
            {t(`guide.hint.${guideHighlight}`)}
          </p>
        )}

        <CreationStrategyGuidePanel
          personaText={personaText}
          onRecommendMode={setGuideHighlight}
          onFocusRecommendedMode={focusCreationMode}
          onApplyTheme={(theme, mode) => {
            focusCreationMode(mode);
            onApplyTheme?.(theme, mode);
          }}
        />
      </section>

      <div className="space-y-4">
        {MODES.filter((m) => m.featured).map((config) => (
          <ModeCard
            key={config.id}
            config={config}
            highlighted={guideHighlight === config.id}
            pulsing={pulseMode === config.id}
            cardRef={(el) => {
              modeCardRefs.current[config.id] = el;
            }}
            onSelect={onSelect}
            t={t}
            featured
          />
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          {MODES.filter((m) => !m.featured).map((config) => (
            <ModeCard
              key={config.id}
              config={config}
              highlighted={guideHighlight === config.id}
              pulsing={pulseMode === config.id}
              cardRef={(el) => {
                modeCardRefs.current[config.id] = el;
              }}
              onSelect={onSelect}
              t={t}
            />
          ))}
        </div>
      </div>

      {onReworkArticle && (
        <RecentPostsSection
          onRework={onReworkArticle}
          reworkArticleId={reworkArticleId}
        />
      )}
    </div>
  );
}

function ModeCard({
  config,
  highlighted,
  pulsing,
  cardRef,
  onSelect,
  t,
  featured = false,
}: {
  config: ModeConfig;
  highlighted: boolean;
  pulsing?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
  onSelect: (mode: ModeId) => void;
  t: ReturnType<typeof useTranslations<"setup.articles.create.modePicker">>;
  featured?: boolean;
}) {
  const mode = config.id;
  const accent = ACCENT[config.accent];
  const outputs = t.raw(`modes.${mode}.outputs`) as string[];

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={() => onSelect(mode)}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200",
        accent.border,
        accent.borderHover,
        "hover:-translate-y-0.5 hover:shadow-lg",
        featured ? "p-6 md:p-7" : "p-5",
        highlighted ? `ring-2 ${accent.ring} shadow-md` : "",
        pulsing ? `ring-4 ${accent.ring} scale-[1.01] shadow-lg` : "",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.gradient} opacity-80`}
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.bg} ${accent.icon}`}
          >
            <ModeIcon mode={mode} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {featured && (
                <span
                  className={`rounded-sm px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${accent.badge}`}
                >
                  {t("recommended")}
                </span>
              )}
              <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-widest text-ns-secondary">
                {t(`modes.${mode}.badge`)}
              </span>
            </div>
            <h3
              className={`mt-1 font-black uppercase tracking-tight text-ns-tertiary ${featured ? "text-xl" : "text-base"}`}
            >
              {t(`modes.${mode}.title`)}
            </h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ns-secondary">
              {t(`modes.${mode}.desc`)}
            </p>
          </div>
        </div>
        <span
          className={[
            "inline-flex shrink-0 items-center justify-center rounded-lg bg-ns-hero px-4 py-2.5 text-sm font-semibold text-ns-primary transition-colors",
            "group-hover:bg-ns-primary group-hover:text-black",
            featured ? "sm:self-center" : "w-full sm:w-auto",
          ].join(" ")}
        >
          {t("start")}
          <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
            →
          </span>
        </span>
      </div>
      {Array.isArray(outputs) && outputs.length > 0 && (
        <ul className="relative mt-4 flex flex-wrap gap-2 border-t border-gray-100/80 pt-4">
          {outputs.map((item) => (
            <li
              key={item}
              className="rounded-md border border-gray-100 bg-white/90 px-2.5 py-1 text-xs font-medium text-ns-tertiary"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
