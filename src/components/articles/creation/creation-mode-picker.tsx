"use client";

import { CreationStrategyGuidePanel } from "@/components/articles/creation/creation-strategy-guide";
import type { WizardCreationMode } from "@/lib/prompts/post-brief";
import { BTN_PRIMARY, BTN_SECONDARY, FORM_SECTION_TITLE, FORM_SUBSECTION_TITLE, META_LABEL, PAGE_TITLE, SECTION_TITLE } from "@/lib/ui/nextstep";
import type { CreationStrategyTheme } from "@/types/workspace";
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
  accent: "lime" | "sky" | "violet" | "amber";
  featured?: boolean;
};

const MODES: ModeConfig[] = [
  { id: "profile", accent: "lime", featured: true },
  { id: "news", accent: "sky" },
  { id: "inspiration", accent: "violet" },
];

const ACCENT = {
  lime: {
    ring: "ring-ns-primary/35",
    border: "border-ns-primary/25",
    borderFeatured: "border-ns-primary/45",
    borderHover: "hover:border-ns-primary/70",
    bg: "bg-ns-primary/12",
    icon: "text-ns-tertiary",
    badge: "bg-ns-primary text-black",
    gradient: "from-ns-primary/15 via-ns-primary/5 to-transparent",
    dot: "bg-ns-primary",
    tag: "border-ns-primary/20 bg-ns-primary/5",
  },
  sky: {
    ring: "ring-sky-400/35",
    border: "border-sky-200/90",
    borderFeatured: "border-sky-300",
    borderHover: "hover:border-sky-400",
    bg: "bg-sky-50",
    icon: "text-sky-800",
    badge: "bg-sky-600 text-white",
    gradient: "from-sky-100/70 via-sky-50/40 to-transparent",
    dot: "bg-sky-500",
    tag: "border-sky-100 bg-sky-50/80",
  },
  violet: {
    ring: "ring-violet-400/35",
    border: "border-violet-200/90",
    borderFeatured: "border-violet-300",
    borderHover: "hover:border-violet-400",
    bg: "bg-violet-50",
    icon: "text-violet-800",
    badge: "bg-violet-700 text-white",
    gradient: "from-violet-100/70 via-violet-50/40 to-transparent",
    dot: "bg-violet-500",
    tag: "border-violet-100 bg-violet-50/80",
  },
  amber: {
    ring: "ring-amber-400/35",
    border: "border-amber-200/90",
    borderFeatured: "border-amber-300",
    borderHover: "hover:border-amber-400",
    bg: "bg-amber-50",
    icon: "text-amber-900",
    badge: "bg-amber-700 text-white",
    gradient: "from-amber-100/70 via-amber-50/40 to-transparent",
    dot: "bg-amber-500",
    tag: "border-amber-100 bg-amber-50/80",
  },
} as const;

function ModeIcon({ mode, className }: { mode: ModeId; className?: string }) {
  const cn = className ?? "h-6 w-6";
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
          d="M16 4h4v4M20 4l-5 5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
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
  if (mode === "inspiration") {
    return (
      <svg className={cn} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M9 8h6M9 12h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
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
};

export function CreationModePicker({
  personaText,
  onSelect,
  onApplyTheme,
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
        <h2 className={`mt-2 max-w-2xl ${PAGE_TITLE}`}>{t("heroTitle")}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ns-secondary md:text-base">
          {t("heroSubtitle")}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {[t("heroPill1"), t("heroPill2"), t("heroPill3")].map((pill) => (
            <li
              key={pill}
              className="rounded-full border border-ns-primary/20 bg-white/90 px-3 py-1 text-xs font-semibold text-ns-tertiary"
            >
              {pill}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h3 className={SECTION_TITLE}>{t("decisionMatrixTitle")}</h3>
        <p className="mt-1 text-sm text-ns-secondary">{t("decisionMatrixHint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["profile", "news", "inspiration"] as const).map((modeId) => (
            <div
              key={modeId}
              className="flex min-h-[8.5rem] flex-col rounded-xl border border-gray-100 bg-ns-brand-light/30 px-4 py-3"
            >
              <p className={META_LABEL}>{t(`decisionMatrix.${modeId}.when`)}</p>
              <p className={`mt-2 min-h-[2.75rem] ${FORM_SUBSECTION_TITLE} line-clamp-2`}>
                {t(`modes.${modeId}.title`)}
              </p>
              <p className="mt-auto pt-2 text-xs leading-relaxed text-ns-secondary">
                {t(`decisionMatrix.${modeId}.outcome`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div>
        <p className={`mb-3 ${META_LABEL}`}>{t("modesSectionLabel")}</p>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((config) => (
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

      <details className="group rounded-2xl border border-dashed border-ns-alternate/80 bg-ns-brand-light/40">
        <summary className="cursor-pointer list-none px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden md:px-6">
          <span className="flex items-start justify-between gap-3">
            <span className="flex gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ns-hero text-lg text-ns-primary"
                aria-hidden
              >
                ✦
              </span>
              <span>
                <span className={SECTION_TITLE}>{t("strategyDrawerTitle")}</span>
                <span className="mt-1 block text-sm text-ns-secondary">
                  {t("strategyDrawerHint")}
                </span>
              </span>
            </span>
            <span
              className="mt-1 shrink-0 text-xs font-medium text-ns-secondary transition group-open:rotate-180"
              aria-hidden
            >
              ▾
            </span>
          </span>
        </summary>
        <div className="space-y-4 border-t border-ns-alternate/50 px-5 pb-5 pt-4 md:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
            <p className="text-sm font-medium text-ns-tertiary">
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
        </div>
      </details>
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
}: {
  config: ModeConfig;
  highlighted: boolean;
  pulsing?: boolean;
  cardRef?: (el: HTMLButtonElement | null) => void;
  onSelect: (mode: ModeId) => void;
  t: ReturnType<typeof useTranslations<"setup.articles.create.modePicker">>;
}) {
  const mode = config.id;
  const accent = ACCENT[config.accent];
  const outputs = t.raw(`modes.${mode}.outputs`) as string[];
  const featured = config.featured === true;

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={() => onSelect(mode)}
      className={[
        "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200",
        featured ? accent.borderFeatured : accent.border,
        accent.borderHover,
        "hover:-translate-y-0.5 hover:shadow-md",
        "p-5 md:p-6",
        highlighted ? `ring-2 ${accent.ring} shadow-md` : "",
        pulsing ? `ring-4 ${accent.ring} scale-[1.01] shadow-lg` : "",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.gradient}`}
        aria-hidden
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <div className="min-h-[1.25rem] min-w-[5.75rem]">
            {featured ? (
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${accent.badge}`}
              >
                {t("recommended")}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ns-secondary">
              {t(`modes.${mode}.badge`)}
            </span>
          </div>
        </div>

        <div
          className={`mt-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.bg} ${accent.icon}`}
        >
          <ModeIcon mode={mode} />
        </div>

        <h3 className={`mt-4 min-h-[3.25rem] ${FORM_SECTION_TITLE} line-clamp-2`}>
          {t(`modes.${mode}.title`)}
        </h3>

        <p className="relative mt-3 min-h-[4.5rem] flex-1 text-sm leading-relaxed text-ns-secondary line-clamp-3">
          {t(`modes.${mode}.desc`)}
        </p>

        {Array.isArray(outputs) && outputs.length > 0 && (
          <ul className="relative mt-4 grid min-h-[3.75rem] grid-cols-1 content-start gap-1.5">
            {outputs.map((item) => (
              <li
                key={item}
                className={`w-fit max-w-full rounded-full border px-2.5 py-1 text-[11px] font-medium leading-snug text-ns-tertiary ${accent.tag}`}
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        <span
          className={[
            "relative mt-auto inline-flex w-full items-center justify-center gap-1 pt-6",
            featured ? BTN_PRIMARY : BTN_SECONDARY,
            "!py-2.5 text-sm",
          ].join(" ")}
        >
          {t("start")}
          <span aria-hidden>→</span>
        </span>
      </div>
    </button>
  );
}
