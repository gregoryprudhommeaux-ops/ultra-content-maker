"use client";

import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const QUESTION_KEYS = ["tone", "accuracy", "length", "other"] as const;

type Props = {
  token: string;
};

type PreviewState = {
  hook: string;
  body: string;
  ps?: string;
  status: string;
};

export function DraftReviewClient({ token }: Props) {
  const t = useTranslations("draftReview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/draft-review/${encodeURIComponent(token)}`);
      const data = (await res.json()) as {
        status?: string;
        article?: { hook: string; body: string; ps?: string };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error === "not_found" ? t("errors.notFound") : t("errors.loadFailed"));
        return;
      }
      if (data.status === "submitted") {
        setSubmitted(true);
        return;
      }
      if (data.status === "expired") {
        setError(t("errors.expired"));
        return;
      }
      if (!data.article) {
        setError(t("errors.loadFailed"));
        return;
      }
      setPreview({
        hook: data.article.hook,
        body: data.article.body,
        ps: data.article.ps,
        status: data.status ?? "active",
      });
    } catch {
      setError(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit() {
    const hasAnswer = QUESTION_KEYS.some((key) => answers[key]?.trim());
    if (!hasAnswer) {
      setError(t("errors.answersRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/draft-review/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (data.error === "expired") setError(t("errors.expired"));
        else if (data.error === "already_submitted") setSubmitted(true);
        else setError(t("errors.submitFailed"));
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-ns-secondary">{t("loading")}</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-ns-tertiary">{t("successTitle")}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ns-secondary">{t("successBody")}</p>
      </main>
    );
  }

  if (error && !preview) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    );
  }

  if (!preview) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ns-tertiary">{t("title")}</h1>
      <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>

      <section className="mt-8 rounded-xl border border-ns-border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ns-tertiary">{preview.hook}</h2>
        <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ns-secondary">
          {preview.body}
        </div>
        {preview.ps ? (
          <p className="mt-4 whitespace-pre-wrap text-sm italic text-ns-secondary">{preview.ps}</p>
        ) : null}
      </section>

      <section className="mt-8 space-y-5">
        <h3 className="font-bold text-ns-tertiary">{t("questionsTitle")}</h3>
        {QUESTION_KEYS.map((key) => (
          <label key={key} className="block text-sm">
            <span className={`${LABEL_CLASS} mb-1 block`}>{t(`questions.${key}`)}</span>
            <ImeSafeTextarea
              rows={3}
              value={answers[key] ?? ""}
              onValueChange={(value) =>
                setAnswers((prev) => ({ ...prev, [key]: value }))
              }
              className={`${INPUT_CLASS} resize-y`}
              placeholder={t(`questions.${key}Placeholder`)}
            />
          </label>
        ))}
      </section>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void onSubmit()}
        className={`${BTN_PRIMARY} mt-6 disabled:opacity-50`}
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </main>
  );
}
