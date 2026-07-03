"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { SupportQuoteRow, SupportQuoteStatus } from "@/lib/admin/support-quotes.server";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUSES: SupportQuoteStatus[] = [
  "new",
  "contacted",
  "quoted",
  "won",
  "lost",
  "archived",
];

type Props = {
  embedded?: boolean;
  onQuotesChange?: (quotes: SupportQuoteRow[]) => void;
};

export function AdminSupportQuotesPanel({ embedded = false, onQuotesChange }: Props) {
  const t = useTranslations("adminSupportQuotes");
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<SupportQuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportQuoteStatus | "open" | "all">("open");
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/support-quotes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { quotes: SupportQuoteRow[] };
      const rows = body.quotes ?? [];
      setQuotes(rows);
      onQuotesChange?.(rows);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t, onQuotesChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return quotes;
    if (statusFilter === "open") {
      return quotes.filter((q) => q.status !== "won" && q.status !== "lost" && q.status !== "archived");
    }
    return quotes.filter((q) => q.status === statusFilter);
  }, [quotes, statusFilter]);

  async function saveQuote(
    quoteId: string,
    patch: { status?: SupportQuoteStatus; adminNote?: string },
  ) {
    if (!user) return;
    setPendingId(quoteId);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-quotes", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quoteId, ...patch }),
      });
      if (!res.ok) {
        setError(t("saveFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPendingId(null);
    }
  }

  function planLabel(plan: SupportQuoteRow["plan"]): string {
    if (plan === "starter") return t("plan.starter");
    if (plan === "regular") return t("plan.regular");
    if (plan === "much_more") return t("plan.much_more");
    return t("plan.unspecified");
  }

  return (
    <AdminPanelShell embedded={embedded} tone="slate">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["open", "new", "contacted", "quoted", "won", "lost", "archived", "all"] as const).map(
          (key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                statusFilter === key
                  ? "bg-ns-tertiary text-white"
                  : "border border-ns-border bg-white text-ns-secondary"
              }`}
            >
              {t(`filters.${key}`)}
            </button>
          ),
        )}
      </div>

      {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}

      {!loading && filtered.length === 0 ? (
        <p className="mt-4 text-sm text-ns-secondary">{t("empty")}</p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="mt-4 space-y-3">
          {filtered.map((row) => {
            const expanded = expandedId === row.id;
            const note = draftNotes[row.id] ?? row.adminNote ?? "";
            return (
              <article
                key={row.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ns-hero">
                      {row.companyName}{" "}
                      <span className="font-normal text-ns-secondary">· {row.fullName}</span>
                    </p>
                    <p className="mt-1 text-sm text-ns-secondary">
                      {planLabel(row.plan)} · {row.email}
                      {row.whatsapp ? ` · ${row.whatsapp}` : ""}
                    </p>
                    {row.createdAt ? (
                      <p className="mt-1 text-xs text-ns-secondary">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.createdAt))}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                        row.status === "new"
                          ? "bg-sky-100 text-sky-900"
                          : row.status === "won"
                            ? "bg-emerald-100 text-emerald-900"
                            : row.status === "lost" || row.status === "archived"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {t(`status.${row.status}`)}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-ns-primary hover:underline"
                      onClick={() => setExpandedId(expanded ? null : row.id)}
                    >
                      {expanded ? t("collapse") : t("expand")}
                    </button>
                  </div>
                </div>

                {expanded ? (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                    {row.position ? (
                      <p className="text-sm text-ns-secondary">
                        <span className="font-medium text-ns-tertiary">{t("position")}:</span>{" "}
                        {row.position}
                      </p>
                    ) : null}
                    {row.userId ? (
                      <p className="text-sm text-ns-secondary">
                        <span className="font-medium text-ns-tertiary">UID:</span>{" "}
                        <code className="font-mono text-xs">{row.userId}</code>
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ns-secondary">
                      {row.activityNeed || t("noActivity")}
                    </p>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <label className="block text-sm">
                        <span className="font-medium text-ns-tertiary">{t("statusLabel")}</span>
                        <select
                          className={`${INPUT_CLASS} mt-1`}
                          value={row.status}
                          disabled={pendingId === row.id}
                          onChange={(e) =>
                            void saveQuote(row.id, {
                              status: e.target.value as SupportQuoteStatus,
                            })
                          }
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {t(`status.${s}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm">
                      <span className="font-medium text-ns-tertiary">{t("adminNote")}</span>
                      <textarea
                        className={`${INPUT_CLASS} mt-1 text-sm`}
                        rows={3}
                        value={note}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className={`${BTN_PRIMARY} !px-4 !py-2 text-sm`}
                      disabled={pendingId === row.id}
                      onClick={() => void saveQuote(row.id, { adminNote: note })}
                    >
                      {pendingId === row.id ? t("saving") : t("saveNote")}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
