"use client";

import { ContextHelp } from "@/components/ui/context-help";
import {
  GAP_OTHER_VALUE,
  MAX_MULTI_GAP_SELECTIONS,
  buildInitialRankOrder,
  gapOtherAnswerKey,
  getGapOtherText,
  isGapOtherSelected,
} from "@/lib/persona/gap-answer-utils";
import { normalizeGapQuestionItem } from "@/lib/persona/gap-questions";
import type { GapAnswerValue, ProfileGapQuestion } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Props = {
  questions: ProfileGapQuestion[];
  initialAnswers?: Record<string, GapAnswerValue>;
  onSave: (answers: Record<string, GapAnswerValue>) => Promise<void>;
};

export function buildInitialGapAnswers(
  questions: ProfileGapQuestion[],
  stored?: Record<string, GapAnswerValue>,
): Record<string, GapAnswerValue> {
  const out: Record<string, GapAnswerValue> = {};
  for (const q of questions) {
    const storedValue = stored?.[q.id] ?? stored?.[q.profileKey];
    if (q.type === "rank") {
      out[q.id] = buildInitialRankOrder(q.options ?? [], storedValue);
      continue;
    }
    const v = storedValue;
    if (v !== undefined) out[q.id] = v;
    const other =
      stored?.[gapOtherAnswerKey(q.id)] ??
      stored?.[gapOtherAnswerKey(q.profileKey)];
    if (typeof other === "string" && other.trim()) {
      out[gapOtherAnswerKey(q.id)] = other;
      if (q.type === "single" || q.type === "multi") {
        const current = out[q.id];
        if (q.type === "single" && current === undefined) {
          out[q.id] = GAP_OTHER_VALUE;
        } else if (
          q.type === "multi" &&
          Array.isArray(current) &&
          !current.includes(GAP_OTHER_VALUE)
        ) {
          out[q.id] = [...current, GAP_OTHER_VALUE];
        }
      }
    }
  }
  return out;
}

function selectionList(value: GapAnswerValue | undefined): string[] {
  if (Array.isArray(value)) return [...value];
  if (value === GAP_OTHER_VALUE) return [GAP_OTHER_VALUE];
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function rankOrder(value: GapAnswerValue | undefined): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function GapRankOptions({
  questionId,
  order,
  onChange,
  moveUpLabel,
  moveDownLabel,
  priorityLabel,
}: {
  questionId: string;
  order: string[];
  onChange: (next: string[]) => void;
  moveUpLabel: string;
  moveDownLabel: string;
  priorityLabel: (position: number) => string;
}) {
  function move(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <ol className="space-y-2" aria-labelledby={`gap-rank-${questionId}`}>
      {order.map((option, index) => (
        <li
          key={option}
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 shadow-sm"
        >
          <span className="w-8 shrink-0 text-center text-xs font-black text-amber-900">
            {priorityLabel(index + 1)}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium text-amber-950">{option}</span>
          <div className="flex shrink-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`${moveUpLabel}: ${option}`}
              className="rounded border border-amber-200 p-1 text-amber-900 hover:bg-amber-100 disabled:opacity-30"
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === order.length - 1}
              aria-label={`${moveDownLabel}: ${option}`}
              className="rounded border border-amber-200 p-1 text-amber-900 hover:bg-amber-100 disabled:opacity-30"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function GapsQuestionnaire({ questions, initialAnswers, onSave }: Props) {
  const t = useTranslations("setup.persona.gaps");
  const normalizedQuestions = useMemo(
    () => questions.map(normalizeGapQuestionItem),
    [questions],
  );
  const [answers, setAnswers] = useState<Record<string, GapAnswerValue>>(() =>
    buildInitialGapAnswers(normalizedQuestions, initialAnswers),
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitHintId, setLimitHintId] = useState<string | null>(null);

  useEffect(() => {
    setAnswers(buildInitialGapAnswers(normalizedQuestions, initialAnswers));
    setSaved(false);
  }, [normalizedQuestions, initialAnswers]);

  function setRankOrder(id: string, order: string[]) {
    setAnswers((prev) => ({ ...prev, [id]: order }));
    setSaved(false);
  }

  function setText(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  function setOtherText(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [gapOtherAnswerKey(questionId)]: value }));
    setSaved(false);
  }

  function atMultiLimit(list: string[]): boolean {
    return list.length >= MAX_MULTI_GAP_SELECTIONS;
  }

  function toggleMulti(id: string, option: string) {
    setAnswers((prev) => {
      const list = selectionList(prev[id]);
      if (list.includes(option)) {
        setLimitHintId(null);
        return { ...prev, [id]: list.filter((item) => item !== option) };
      }
      if (atMultiLimit(list)) {
        setLimitHintId(id);
        return prev;
      }
      setLimitHintId(null);
      return { ...prev, [id]: [...list, option] };
    });
    setSaved(false);
  }

  function toggleOtherMulti(id: string, checked: boolean) {
    setAnswers((prev) => {
      const list = selectionList(prev[id]);
      if (checked) {
        if (list.includes(GAP_OTHER_VALUE) || atMultiLimit(list)) {
          if (!list.includes(GAP_OTHER_VALUE)) setLimitHintId(id);
          return prev;
        }
        setLimitHintId(null);
        return { ...prev, [id]: [...list, GAP_OTHER_VALUE] };
      }
      const next = { ...prev, [id]: list.filter((item) => item !== GAP_OTHER_VALUE) };
      if (!next[gapOtherAnswerKey(id)]) delete next[gapOtherAnswerKey(id)];
      setLimitHintId(null);
      return next;
    });
    setSaved(false);
  }

  function setSingle(id: string, option: string) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: option };
      if (option !== GAP_OTHER_VALUE) {
        delete next[gapOtherAnswerKey(id)];
      }
      return next;
    });
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSave(answers);
      setSaved(true);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  if (normalizedQuestions.length === 0) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-amber-200 bg-amber-50/80 p-5"
    >
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-amber-950">
          {t("title")}
          <ContextHelp label={t("title")}>{t("help")}</ContextHelp>
        </h2>
        <p className="mt-1 text-sm text-amber-900/90">{t("subtitle")}</p>
      </div>

      {normalizedQuestions.map((q) => {
        const otherText = getGapOtherText(answers, q.id);
        const otherSelected = isGapOtherSelected(answers[q.id]);

        return (
          <fieldset key={q.id} className="space-y-2">
            <legend className={LABEL_CLASS}>{q.label}</legend>
            {q.hint ? (
              <p className="-mt-1 text-xs text-amber-800/80">{q.hint}</p>
            ) : null}
            {q.type === "multi" ? (
              <p className="text-xs font-medium text-amber-800/90">{t("multiLimitHint")}</p>
            ) : null}
            {limitHintId === q.id ? (
              <p className="text-xs font-semibold text-amber-900">{t("multiLimitReached")}</p>
            ) : null}

            {q.type === "text" && (
              <input
                type="text"
                value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
                onChange={(e) => setText(q.id, e.target.value)}
                className={INPUT_CLASS}
                placeholder={t("textPlaceholder")}
              />
            )}

            {q.type === "single" && q.options && (
              <ul className="space-y-2">
                {q.options.map((opt) => (
                  <li key={opt}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => setSingle(q.id, opt)}
                        className="mt-0.5"
                      />
                      <span>{opt}</span>
                    </label>
                  </li>
                ))}
                <li>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === GAP_OTHER_VALUE}
                      onChange={() => setSingle(q.id, GAP_OTHER_VALUE)}
                      className="mt-0.5"
                    />
                    <span>{t("otherLabel")}</span>
                  </label>
                  {answers[q.id] === GAP_OTHER_VALUE ? (
                    <input
                      type="text"
                      value={otherText}
                      onChange={(e) => setOtherText(q.id, e.target.value)}
                      className={`${INPUT_CLASS} mt-2`}
                      placeholder={t("otherPlaceholder")}
                    />
                  ) : null}
                </li>
              </ul>
            )}

            {q.type === "rank" && q.options && (
              <>
                <p
                  id={`gap-rank-${q.id}`}
                  className="text-xs font-medium text-amber-800/90"
                >
                  {t("rankHint")}
                </p>
                <GapRankOptions
                  questionId={q.id}
                  order={rankOrder(answers[q.id])}
                  onChange={(next) => setRankOrder(q.id, next)}
                  moveUpLabel={t("moveUp")}
                  moveDownLabel={t("moveDown")}
                  priorityLabel={(position) => t("rankPosition", { position })}
                />
              </>
            )}

            {q.type === "multi" && q.options && (
              <ul className="space-y-2">
                {q.options.map((opt) => {
                  const list = selectionList(answers[q.id]);
                  const checked = list.includes(opt);
                  return (
                    <li key={opt}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMulti(q.id, opt)}
                          className="mt-0.5"
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  );
                })}
                <li>
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                    <input
                      type="checkbox"
                      checked={otherSelected}
                      onChange={(e) => toggleOtherMulti(q.id, e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>{t("otherLabel")}</span>
                  </label>
                  {otherSelected ? (
                    <input
                      type="text"
                      value={otherText}
                      onChange={(e) => setOtherText(q.id, e.target.value)}
                      className={`${INPUT_CLASS} mt-2`}
                      placeholder={t("otherPlaceholder")}
                    />
                  ) : null}
                </li>
              </ul>
            )}
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {saved && (
          <span className="text-sm font-medium text-amber-900">{t("saved")}</span>
        )}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
