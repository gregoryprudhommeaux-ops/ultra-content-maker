"use client";

import { LlmProviderConsoleLink } from "@/components/setup/llm-provider-console-link";
import { useAuth } from "@/components/auth/auth-provider";
import { shouldShowLlmProviderConsole } from "@/lib/llm/provider-guides";
import { getClientAuth } from "@/lib/firebase/client";
import { ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";

export type ErrorReportContext = {
  surface: string;
  userMessage: string;
  errorCode?: string;
  detail?: string;
};

type Props = ErrorReportContext & {
  hint?: string;
  technical?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Show link to the user's LLM provider console + Réglages clé API. */
  showProviderConsole?: boolean;
  children?: ReactNode;
  className?: string;
};

export function UserErrorBanner({
  surface,
  userMessage,
  errorCode,
  detail,
  hint,
  technical: _technical,
  onRetry,
  retryLabel,
  showProviderConsole,
  children,
  className = "",
}: Props) {
  const showConsole =
    showProviderConsole ?? shouldShowLlmProviderConsole(errorCode);
  const t = useTranslations("errors");
  const locale = useLocale();
  const { user } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "failed">(
    "idle",
  );

  const sendReport = useCallback(async () => {
    if (!user) return;
    setReportState("sending");
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) {
        setReportState("failed");
        return;
      }

      const res = await fetch("/api/support/report-error", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          surface,
          userMessage,
          errorCode,
          detail,
          userNote: userNote.trim() || undefined,
          locale,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      if (!res.ok) {
        setReportState("failed");
        return;
      }
      setReportState("sent");
      setShowReportForm(false);
    } catch {
      setReportState("failed");
    }
  }, [user, surface, userMessage, errorCode, detail, userNote, locale]);

  return (
    <div
      role="alert"
      className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${className}`}
    >
      <p className="font-medium">{userMessage}</p>
      {hint ? <p className="mt-1.5 text-red-700/90">{hint}</p> : null}

      {showConsole ? (
        <div className="mt-2 rounded-lg border border-red-200/80 bg-white/70 px-3 py-2">
          <LlmProviderConsoleLink />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-semibold underline"
          >
            {retryLabel ?? t("retry")}
          </button>
        ) : null}
        {children}
        {user && reportState !== "sent" ? (
          <button
            type="button"
            onClick={() => setShowReportForm((v) => !v)}
            className="text-sm font-semibold underline"
            disabled={reportState === "sending"}
          >
            {t("report.button")}
          </button>
        ) : null}
        {reportState === "sent" ? (
          <span className="text-sm font-medium text-emerald-800">{t("report.sent")}</span>
        ) : null}
        {reportState === "failed" ? (
          <span className="text-sm text-red-900">{t("report.failed")}</span>
        ) : null}
      </div>

      {showReportForm && user ? (
        <div className="mt-3 space-y-2 border-t border-red-200/80 pt-3">
          <p className="text-xs text-red-700">{t("report.hint")}</p>
          <ImeSafeTextarea
            value={userNote}
            onValueChange={setUserNote}
            placeholder={t("report.notePlaceholder")}
            rows={3}
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary"
            maxLength={2000}
            lang={locale}
          />
          <button
            type="button"
            disabled={reportState === "sending"}
            onClick={() => void sendReport()}
            className="rounded-lg bg-ns-tertiary px-4 py-2 text-xs font-bold uppercase text-ns-primary disabled:opacity-60"
          >
            {reportState === "sending" ? t("report.sending") : t("report.send")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
