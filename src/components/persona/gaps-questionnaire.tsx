"use client";

import type { GapAnswerValue, ProfileGapQuestion } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

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
    const v = stored?.[q.id] ?? stored?.[q.profileKey];
    if (v !== undefined) out[q.id] = v;
  }
  return out;
}

export function GapsQuestionnaire({ questions, initialAnswers, onSave }: Props) {
  const t = useTranslations("setup.persona.gaps");
  const [answers, setAnswers] = useState<Record<string, GapAnswerValue>>(() =>
    buildInitialGapAnswers(questions, initialAnswers),
  );
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAnswers(buildInitialGapAnswers(questions, initialAnswers));
    setSaved(false);
  }, [questions, initialAnswers]);

  function setText(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  function toggleMulti(id: string, option: string) {
    setAnswers((prev) => {
      const current = prev[id];
      const list = Array.isArray(current) ? [...current] : current ? [current] : [];
      const next = list.includes(option)
        ? list.filter((o) => o !== option)
        : [...list, option];
      return { ...prev, [id]: next };
    });
    setSaved(false);
  }

  function setSingle(id: string, option: string) {
    setAnswers((prev) => ({ ...prev, [id]: option }));
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

  if (questions.length === 0) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 space-y-6"
    >
      <div>
        <h2 className="text-base font-semibold text-amber-950">{t("title")}</h2>
        <p className="mt-1 text-sm text-amber-900/90">{t("subtitle")}</p>
      </div>

      {questions.map((q) => (
        <fieldset key={q.id} className="space-y-2">
          <legend className={LABEL_CLASS}>{q.label}</legend>
          {q.hint ? <p className="text-xs text-amber-800/80 -mt-1">{q.hint}</p> : null}

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
            </ul>
          )}

          {q.type === "multi" && q.options && (
            <ul className="space-y-2">
              {q.options.map((opt) => {
                const current = answers[q.id];
                const checked = Array.isArray(current)
                  ? current.includes(opt)
                  : current === opt;
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
            </ul>
          )}
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {saved && <span className="text-sm font-medium text-amber-900">{t("saved")}</span>}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
