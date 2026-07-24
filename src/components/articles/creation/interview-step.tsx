"use client";

import type {
  InterviewAnswer,
  InterviewQuestion,
  InterviewSessionPack,
} from "@/lib/prompts/interview-extract";
import { BTN_PRIMARY, BTN_SECONDARY, FORM_SECTION_TITLE, META_LABEL } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Props = {
  questions: InterviewQuestion[];
  loadingQuestions: boolean;
  extracting: boolean;
  onReloadQuestions: () => void;
  onExtract: (answers: InterviewAnswer[]) => void;
};

export function InterviewStep({
  questions,
  loadingQuestions,
  extracting,
  onReloadQuestions,
  onExtract,
}: Props) {
  const t = useTranslations("setup.articles.create.interview");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const filledCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? "").trim().length >= 12).length,
    [answers, questions],
  );

  const canExtract = filledCount >= 2 && !extracting && !loadingQuestions;

  return (
    <div className="space-y-5">
      <div>
        <p className={META_LABEL}>{t("eyebrow")}</p>
        <h2 className={`mt-1 ${FORM_SECTION_TITLE}`}>{t("title")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ns-secondary">{t("hint")}</p>
      </div>

      {loadingQuestions ? (
        <p className="text-sm text-ns-secondary">{t("loadingQuestions")}</p>
      ) : questions.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-ns-alternate bg-white p-5">
          <p className="text-sm text-ns-secondary">{t("noQuestions")}</p>
          <button type="button" onClick={onReloadQuestions} className={BTN_SECONDARY}>
            {t("reloadQuestions")}
          </button>
        </div>
      ) : (
        <ol className="space-y-4">
          {questions.map((q, index) => (
            <li
              key={q.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <label className="block">
                <span className={META_LABEL}>
                  {t("questionLabel", { n: index + 1 })}
                </span>
                <span className="mt-1 block text-sm font-semibold text-ns-tertiary">
                  {q.text}
                </span>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  rows={3}
                  placeholder={t("answerPlaceholder")}
                  className="mt-3 w-full rounded-lg border border-ns-alternate bg-ns-brand-light/40 px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/50 focus:border-ns-primary focus:outline-none focus:ring-2 focus:ring-ns-primary/20"
                />
              </label>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canExtract}
          onClick={() =>
            onExtract(
              questions.map((q) => ({
                questionId: q.id,
                questionText: q.text,
                answer: (answers[q.id] ?? "").trim(),
              })),
            )
          }
          className={`${BTN_PRIMARY} disabled:opacity-50`}
        >
          {extracting ? t("extracting") : t("extractCta")}
        </button>
        {!loadingQuestions && questions.length > 0 ? (
          <button
            type="button"
            disabled={extracting}
            onClick={onReloadQuestions}
            className={BTN_SECONDARY}
          >
            {t("reloadQuestions")}
          </button>
        ) : null}
        <p className="text-xs text-ns-secondary">
          {t("filledHint", { count: filledCount, min: 2 })}
        </p>
      </div>
    </div>
  );
}

type PackProps = {
  pack: InterviewSessionPack;
  matterSummary?: string;
  onUseAngle?: (title: string, angle: string) => void;
};

export function InterviewSessionPackPanel({ pack, matterSummary, onUseAngle }: PackProps) {
  const t = useTranslations("setup.articles.create.interview.pack");

  if (pack.storytellingTips.length === 0 && pack.nextAngles.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-ns-primary/20 bg-ns-primary/5 p-5">
      <p className={META_LABEL}>{t("eyebrow")}</p>
      <h3 className={`mt-1 ${FORM_SECTION_TITLE}`}>{t("title")}</h3>
      <p className="mt-1 text-sm text-ns-secondary">{t("hint")}</p>

      {matterSummary?.trim() ? (
        <div className="mt-4 rounded-xl border border-white/80 bg-white/80 px-4 py-3">
          <p className={META_LABEL}>{t("matterLabel")}</p>
          <p className="mt-1 text-sm leading-relaxed text-ns-tertiary">{matterSummary}</p>
        </div>
      ) : null}

      {pack.storytellingTips.length > 0 ? (
        <div className="mt-4">
          <p className={META_LABEL}>{t("tipsLabel")}</p>
          <ul className="mt-2 space-y-2">
            {pack.storytellingTips.map((tip) => (
              <li
                key={tip}
                className="rounded-lg border border-ns-alternate/60 bg-white px-3 py-2 text-sm text-ns-tertiary"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {pack.nextAngles.length > 0 ? (
        <div className="mt-4">
          <p className={META_LABEL}>{t("anglesLabel")}</p>
          <ul className="mt-2 space-y-2">
            {pack.nextAngles.map((item) => (
              <li
                key={`${item.title}-${item.angle.slice(0, 24)}`}
                className="flex flex-col gap-2 rounded-lg border border-ns-alternate/60 bg-white px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-ns-tertiary">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ns-secondary">{item.angle}</p>
                  {item.pillar ? (
                    <p className="mt-1 text-micro font-medium text-ns-secondary/70">
                      {t(`pillar.${item.pillar}`)}
                    </p>
                  ) : null}
                </div>
                {onUseAngle ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-ns-tertiary underline"
                    onClick={() => onUseAngle(item.title, item.angle)}
                  >
                    {t("useAngle")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
