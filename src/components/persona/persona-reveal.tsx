"use client";

import type {
  PersonaRevealCardKey,
  PersonaRevealSummary,
} from "@/lib/persona/extract-persona-summary";
import { BTN_PRIMARY, HEADING_TITLE } from "@/lib/ui/nextstep";
import { ButtonSpinner } from "@/components/ui/generating-indicator";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";

const CARD_KEYS = ["positioning", "audience", "angle", "tone"] as const;

type DraftProps = {
  mode: "draft";
  summary: PersonaRevealSummary;
  audienceSkipped: boolean;
  onRegenerate: () => void;
  onValidate: () => void;
  validateDisabled: boolean;
  pending: boolean;
  onPillarSave?: (key: PersonaRevealCardKey, text: string) => Promise<void>;
  pillarSaving?: PersonaRevealCardKey | null;
};

type ValidatedProps = {
  mode: "validated";
  summary: PersonaRevealSummary;
  audienceSkipped: boolean;
  onPillarSave?: (key: PersonaRevealCardKey, text: string) => Promise<void>;
  pillarSaving?: PersonaRevealCardKey | null;
};

type Props = DraftProps | ValidatedProps;

function EditablePillarText({
  cardKey,
  text,
  editable,
  saving,
  onSave,
}: {
  cardKey: PersonaRevealCardKey;
  text: string;
  editable: boolean;
  saving: boolean;
  onSave?: (key: PersonaRevealCardKey, text: string) => Promise<void>;
}) {
  const t = useTranslations("setup.persona.reveal");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  async function commit() {
    const next = draft.trim();
    if (!onSave || next === text.trim()) {
      setEditing(false);
      return;
    }
    await onSave(cardKey, next);
    setEditing(false);
  }

  if (!editable || !onSave) {
    return (
      <p className="mt-2 text-sm font-medium leading-relaxed text-ns-tertiary">
        {text}
      </p>
    );
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <ImeSafeTextarea
          id={`persona-pillar-${cardKey}`}
          value={draft}
          onValueChange={setDraft}
          rows={4}
          autoFocus
          disabled={saving}
          className="w-full resize-y rounded-lg border border-ns-primary/40 bg-white px-3 py-2 text-sm font-medium leading-relaxed text-ns-tertiary shadow-inner focus:border-ns-primary focus:outline-none focus:ring-2 focus:ring-ns-primary/20"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(text);
              setEditing(false);
            }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void commit();
            }
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void commit()}
            className="rounded-md bg-ns-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ns-hero hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t("editSaving") : t("editSave")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setDraft(text);
              setEditing(false);
            }}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-ns-secondary hover:text-ns-tertiary"
          >
            {t("editCancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group mt-2 w-full rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-ns-primary/25 hover:bg-ns-primary/5 focus-visible:border-ns-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ns-primary/20"
    >
      <p className="text-sm font-medium leading-relaxed text-ns-tertiary">{text}</p>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-ns-primary opacity-80 group-hover:opacity-100">
        <Pencil className="h-3 w-3" aria-hidden />
        {t("clickToEdit")}
      </p>
    </button>
  );
}

export function PersonaReveal(props: Props) {
  const t = useTranslations("setup.persona.reveal");
  const { summary, audienceSkipped } = props;
  const onPillarSave = props.onPillarSave;
  const pillarSaving = props.pillarSaving ?? null;
  const editable = Boolean(onPillarSave);

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
              <h2 className={`mt-1 ${HEADING_TITLE}`}>
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
            <h2 className={`mt-1 ${HEADING_TITLE}`}>
              {t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-ns-secondary">
              {t("subtitle")}
            </p>
          </>
        )}
        {editable && (
          <p className="mt-3 text-xs font-medium text-ns-secondary">{t("editHint")}</p>
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
          const canEdit =
            editable &&
            Boolean(card?.text || key !== "audience" || !audienceSkipped);

          return (
            <article
              key={key}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-ns-primary">
                {t(`cards.${key}.label`)}
              </p>
              <EditablePillarText
                cardKey={key}
                text={text}
                editable={canEdit}
                saving={pillarSaving === key}
                onSave={onPillarSave}
              />
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
