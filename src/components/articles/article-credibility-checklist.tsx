"use client";

import {
  credibilityChecklistSummary,
  runCredibilityChecklist,
  type CredibilityCheckResult,
} from "@/lib/articles/credibility-checklist";
import { getClientAuth } from "@/lib/firebase/client";
import { hasClientLlmAccess, llmPayloadForAccess } from "@/lib/llm/client-payload";
import type { CredibilityAuditResult } from "@/lib/prompts/article-credibility-audit";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import type { SubscriptionAccess } from "@/types/subscription";
import type { ContentLanguage, OrganizationProfile } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Props = {
  hook: string;
  body: string;
  ps?: string;
  orgProfile: OrganizationProfile;
  contentLanguage: ContentLanguage;
  userId: string;
  subscriptionAccess: SubscriptionAccess | null;
  compact?: boolean;
};

function statusIcon(status: CredibilityCheckResult["status"]): string {
  switch (status) {
    case "pass":
      return "✓";
    case "warn":
      return "!";
    case "fail":
      return "✗";
    default:
      return "–";
  }
}

function detailMessage(
  t: ReturnType<typeof useTranslations<"setup.articles.credibilityChecklist">>,
  detail: string | undefined,
): string | null {
  if (!detail) return null;
  switch (detail) {
    case "numbers_detected":
      return t("details.numbers_detected");
    case "overpromise_risk":
      return t("details.overpromise_risk");
    case "unknown_name":
      return t("details.unknown_name");
    case "source_required":
      return t("details.source_required");
    default:
      return detail;
  }
}

function statusClass(status: CredibilityCheckResult["status"]): string {
  switch (status) {
    case "pass":
      return "text-emerald-700";
    case "warn":
      return "text-amber-700";
    case "fail":
      return "text-red-700";
    default:
      return "text-ns-secondary";
  }
}

function auditOverallClass(overall: CredibilityAuditResult["overall"]): string {
  switch (overall) {
    case "pass":
      return "bg-emerald-100 text-emerald-900";
    case "block":
      return "bg-red-100 text-red-900";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

export function ArticleCredibilityChecklist({
  hook,
  body,
  ps,
  orgProfile,
  contentLanguage,
  userId,
  subscriptionAccess,
  compact = false,
}: Props) {
  const t = useTranslations("setup.articles.credibilityChecklist");
  const [auditLoading, setAuditLoading] = useState(false);
  const [audit, setAudit] = useState<CredibilityAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const results = useMemo(
    () => runCredibilityChecklist(hook, body, ps, orgProfile),
    [hook, body, ps, orgProfile],
  );

  const summary = credibilityChecklistSummary(results);
  const visible = results.filter((r) => r.status !== "skip");

  async function runLlmAudit() {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      const llmProfile = await getUserLlmProfile(userId);
      const llmPayload = llmPayloadForAccess(llmProfile, subscriptionAccess);
      if (!token || !hasClientLlmAccess(subscriptionAccess, llmPayload)) {
        setAuditError(t("auditNoLlm"));
        return;
      }

      const res = await fetch("/api/articles/credibility-audit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentLanguage,
          hook,
          body,
          ps,
          llm: llmPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.audit) {
        setAuditError(t("auditFailed"));
        return;
      }
      setAudit(data.audit as CredibilityAuditResult);
    } catch {
      setAuditError(t("auditFailed"));
    } finally {
      setAuditLoading(false);
    }
  }

  if (visible.length === 0) return null;

  const showAuditButton = !summary.allPass;

  return (
    <div
      className={
        compact
          ? "rounded-lg border border-violet-200/70 bg-violet-50/40 px-3 py-3"
          : "rounded-xl border border-violet-200/70 bg-violet-50/40 p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ns-tertiary">{t("title")}</p>
          {!compact && (
            <p className="mt-0.5 text-xs text-ns-secondary">{t("subtitle")}</p>
          )}
        </div>
        {summary.allPass && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            {t("allPass")}
          </span>
        )}
        {summary.hasFail && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
            {t("hasIssues")}
          </span>
        )}
        {!summary.hasFail && summary.hasWarn && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            {t("reviewSuggested")}
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((r) => (
          <li key={r.id} className="flex gap-2 text-sm">
            <span className={`shrink-0 font-bold ${statusClass(r.status)}`}>
              {statusIcon(r.status)}
            </span>
            <div>
              <p className="font-medium text-ns-tertiary">{t(`checks.${r.id}`)}</p>
              {detailMessage(t, r.detail) ? (
                <p className="text-xs text-ns-secondary">{detailMessage(t, r.detail)}</p>
              ) : null}
              {r.status === "pass" && (
                <p className="text-xs text-ns-secondary">{t("statusPass")}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showAuditButton && (
        <div className="mt-3 border-t border-violet-200/60 pt-3">
          <button
            type="button"
            disabled={auditLoading}
            onClick={() => void runLlmAudit()}
            className="text-xs font-medium text-violet-900 underline disabled:opacity-50"
          >
            {auditLoading ? t("auditLoading") : t("runAudit")}
          </button>
          {auditError ? (
            <p className="mt-2 text-xs text-red-700">{auditError}</p>
          ) : null}
          {audit ? (
            <div className="mt-3 space-y-2 rounded-lg border border-violet-100 bg-white/80 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-ns-tertiary">{t("auditTitle")}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${auditOverallClass(audit.overall)}`}
                >
                  {t(`auditOverall.${audit.overall}`)}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-ns-tertiary">{audit.summary}</p>
              {audit.issues.length > 0 && (
                <ul className="space-y-1.5 text-xs text-ns-secondary">
                  {audit.issues.slice(0, 5).map((issue, i) => (
                    <li key={i}>
                      <span className="font-medium text-ns-tertiary">
                        [{issue.severity}] {issue.excerpt || issue.category}
                      </span>
                      {issue.fix ? ` — ${issue.fix}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {audit.suggestedEdits.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ns-secondary">
                    {t("auditSuggestions")}
                  </p>
                  <ul className="mt-1 space-y-1 text-xs text-ns-tertiary">
                    {audit.suggestedEdits.map((edit, i) => (
                      <li key={i} className="whitespace-pre-wrap">
                        {edit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
