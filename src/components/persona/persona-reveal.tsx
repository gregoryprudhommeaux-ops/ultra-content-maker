"use client";

import type { PersonaRevealSummary } from "@/lib/persona/extract-persona-summary";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { ButtonSpinner } from "@/components/ui/generating-indicator";
import { Link } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

const CARD_KEYS = ["positioning", "audience", "angle", "tone"] as const;

type DraftProps = {
  mode: "draft";
  summary: PersonaRevealSummary;
  audienceSkipped: boolean;
  onRegenerate: () => void;
  onValidate: () => void;
  validateDisabled: boolean;
  pending: boolean;
};

type ValidatedProps = {
  mode: "validated";
  summary: PersonaRevealSummary;
  audienceSkipped: boolean;
};

type Props = DraftProps | ValidatedProps;

export function PersonaReveal(props: Props) {
  const t = useTranslations("setup.persona.reveal");
  const { summary, audienceSkipped } = props;

  return (
    <section className="overflow-hidden rounded-2xl border border-ns-primary/25 bg-gradient-to-br from-ns-brand-light via-white to-white shadow-sm">
      <div className="border-b border-ns-primary/15 px-5 py-5 md:px-6">
        {props.mode === "validated" ? (
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 h-6 w-6 shrink-0 text-ns-primary"
              aria-hidden
            />
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-ns-primary">
                {t("validatedEyebrow")}
              </p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-ns-tertiary">
                {t("validatedTitle")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
                {t("validatedSubtitle")}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-ns-primary">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight text-ns-tertiary md:text-2xl">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
              {t("subtitle")}
            </p>
          </>
        )}
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6">
        {CARD_KEYS.map((key) => {
          const card = summary.cards.find((c) => c.key === key);
          const text =
            key === "audience" && !card?.text
              ? audienceSkipped
                ? t("audienceSkipped")
                : t("audienceEmpty")
              : card?.text || t("cardEmpty");

          return (
            <article
              key={key}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-ns-primary">
                {t(`cards.${key}.label`)}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ns-tertiary">
                {text}
              </p>
              {card?.text && (
                <p className="mt-2 text-[11px] font-medium text-ns-secondary/80">
                  {card.source === "persona" ? t("fromPersona") : t("fromProfile")}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {props.mode === "draft" && (
        <div className="flex flex-wrap gap-3 border-t border-gray-100 bg-white/70 px-5 py-4 md:px-6">
          <button
            type="button"
            disabled={props.pending}
            onClick={props.onRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-semibold text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
          >
            {props.pending ? (
              <>
                <ButtonSpinner className="border-ns-alternate border-t-zinc-800" />
                {t("regenerating")}
              </>
            ) : (
              t("regenerate")
            )}
          </button>
          <button
            type="button"
            disabled={props.pending || props.validateDisabled}
            onClick={props.onValidate}
            className={`inline-flex items-center gap-2 ${BTN_PRIMARY} disabled:opacity-50`}
          >
            {props.pending ? (
              <>
                <ButtonSpinner />
                {t("validating")}
              </>
            ) : (
              t("validate")
            )}
          </button>
          <Link
            href="/setup/author?tab=essential"
            className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-ns-tertiary underline hover:text-ns-primary"
          >
            {t("completeProfile")}
          </Link>
        </div>
      )}
    </section>
  );
}
