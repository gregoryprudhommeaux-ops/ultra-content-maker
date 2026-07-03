"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { BillingInvoiceRow, BillingInvoiceStatus } from "@/lib/billing/wire-billing";
import { formatInvoiceAmount, invoiceKindLabel } from "@/lib/billing/wire-billing";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  embedded?: boolean;
};

const STATUS_FILTERS: Array<BillingInvoiceStatus | "all"> = [
  "all",
  "draft",
  "ready_to_send",
  "sent",
  "paid",
  "follow_up",
];

type EditorState = {
  amount: string;
  memoReference: string;
  customerEmail: string;
  customerName: string;
  invoiceBody: string;
  emailSubject: string;
  emailBody: string;
  scheduledSendAt: string;
  status: BillingInvoiceStatus;
};

function toEditor(row: BillingInvoiceRow): EditorState {
  return {
    amount: String(row.amount),
    memoReference: row.memoReference,
    customerEmail: row.customerEmail ?? "",
    customerName: row.customerName ?? "",
    invoiceBody: row.invoiceBody ?? "",
    emailSubject: row.emailSubject ?? "",
    emailBody: row.emailBody ?? "",
    scheduledSendAt: row.scheduledSendAt?.slice(0, 16) ?? "",
    status: row.status,
  };
}

function statusTone(status: BillingInvoiceStatus): string {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "ready_to_send":
      return "bg-amber-100 text-amber-900";
    case "sent":
      return "bg-sky-100 text-sky-900";
    case "paid":
      return "bg-emerald-100 text-emerald-900";
    case "follow_up":
      return "bg-rose-100 text-rose-900";
    case "void":
      return "bg-neutral-100 text-neutral-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function AdminBillingInvoicesPanel({ embedded = false }: Props) {
  const t = useTranslations("adminBillingInvoices");
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BillingInvoiceStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/billing-invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { invoices: BillingInvoiceRow[] };
      setInvoices(body.invoices ?? []);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((row) => row.status === filter);
  }, [filter, invoices]);

  const selected = useMemo(
    () => invoices.find((row) => `${row.userId}-${row.id}` === selectedId) ?? null,
    [invoices, selectedId],
  );

  function selectRow(row: BillingInvoiceRow) {
    setSelectedId(`${row.userId}-${row.id}`);
    setEditor(toEditor(row));
    setMessage(null);
  }

  async function patchInvoice(
    action?: "regenerate_template" | "send_now" | "mark_paid" | "mark_follow_up",
    extra?: Partial<EditorState>,
  ) {
    if (!user || !selected || !editor) return;
    setPending(true);
    setError(null);
    setMessage(null);
    const payload = { ...editor, ...extra };
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/billing-invoices", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selected.userId,
          invoiceId: selected.id,
          action,
          status: payload.status,
          amount: Number(payload.amount) || 0,
          memoReference: payload.memoReference,
          invoiceBody: payload.invoiceBody,
          emailSubject: payload.emailSubject,
          emailBody: payload.emailBody,
          scheduledSendAt: payload.scheduledSendAt
            ? new Date(payload.scheduledSendAt).toISOString()
            : null,
          customerEmail: payload.customerEmail,
          customerName: payload.customerName,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        invoice?: BillingInvoiceRow;
      };
      if (!res.ok) {
        setError(body.detail ?? body.error ?? t("saveFailed"));
        return;
      }
      if (body.invoice) {
        setInvoices((prev) =>
          prev.map((row) =>
            row.userId === body.invoice!.userId && row.id === body.invoice!.id
              ? body.invoice!
              : row,
          ),
        );
        setEditor(toEditor(body.invoice));
      }
      setMessage(
        action === "send_now"
          ? t("sentOk")
          : action === "mark_paid"
            ? t("paidOk")
            : t("savedOk"),
      );
      if (action === "send_now" || action === "mark_paid") await load();
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPanelShell embedded={embedded}>
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === status
                ? "bg-ns-primary text-black"
                : "border border-ns-border bg-white text-ns-secondary"
            }`}
          >
            {status === "all" ? t("filters.all") : t(`status.${status}`)}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="mt-4 text-sm text-ns-secondary">{t("empty")}</p>
      ) : null}

      {!loading && filtered.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ns-secondary">
                <th className="px-2 py-2">{t("columns.period")}</th>
                <th className="px-2 py-2">{t("columns.user")}</th>
                <th className="px-2 py-2">{t("columns.kind")}</th>
                <th className="px-2 py-2">{t("columns.amount")}</th>
                <th className="px-2 py-2">{t("columns.status")}</th>
                <th className="px-2 py-2">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const key = `${row.userId}-${row.id}`;
                const isSelected = selectedId === key;
                return (
                  <tr
                    key={key}
                    className={`border-t border-ns-border ${isSelected ? "bg-ns-brand-light/50" : ""}`}
                  >
                    <td className="px-2 py-2 font-mono text-xs">{row.periodMonth}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-ns-hero">
                        {row.customerName || row.customerEmail || "—"}
                      </div>
                      <code className="text-xs text-ns-secondary">{row.userId.slice(0, 12)}…</code>
                    </td>
                    <td className="px-2 py-2">
                      {invoiceKindLabel(row.kind, row.tier)}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatInvoiceAmount(row.currency, row.amount)}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(row.status)}`}
                      >
                        {t(`status.${row.status}`)}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-ns-primary underline-offset-2 hover:underline"
                        onClick={() => selectRow(row)}
                      >
                        {t("edit")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected && editor ? (
        <div className="mt-6 space-y-4 rounded-xl border border-ns-border bg-ns-background p-4">
          <div>
            <h3 className="font-bold text-ns-tertiary">{t("editorTitle")}</h3>
            <p className="mt-1 text-xs text-ns-secondary">{t("editorHint")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("fields.amount")}</span>
              <input
                className="w-full rounded-lg border border-ns-border px-3 py-2"
                value={editor.amount}
                onChange={(e) => setEditor({ ...editor, amount: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("fields.status")}</span>
              <select
                className="w-full rounded-lg border border-ns-border px-3 py-2"
                value={editor.status}
                onChange={(e) =>
                  setEditor({ ...editor, status: e.target.value as BillingInvoiceStatus })
                }
              >
                {(["draft", "ready_to_send", "sent", "paid", "follow_up", "void"] as const).map(
                  (status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}`)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("fields.customerEmail")}</span>
              <input
                type="email"
                className="w-full rounded-lg border border-ns-border px-3 py-2"
                value={editor.customerEmail}
                onChange={(e) => setEditor({ ...editor, customerEmail: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("fields.customerName")}</span>
              <input
                className="w-full rounded-lg border border-ns-border px-3 py-2"
                value={editor.customerName}
                onChange={(e) => setEditor({ ...editor, customerName: e.target.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium">{t("fields.memo")}</span>
              <input
                className="w-full rounded-lg border border-ns-border px-3 py-2 font-mono text-xs"
                value={editor.memoReference}
                onChange={(e) => setEditor({ ...editor, memoReference: e.target.value })}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium">{t("fields.scheduledSend")}</span>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-ns-border px-3 py-2"
                value={editor.scheduledSendAt}
                onChange={(e) => setEditor({ ...editor, scheduledSendAt: e.target.value })}
              />
              <span className="mt-1 block text-xs text-ns-secondary">{t("scheduledHint")}</span>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("fields.invoiceBody")}</span>
            <textarea
              rows={6}
              className="w-full rounded-lg border border-ns-border px-3 py-2 font-mono text-xs"
              value={editor.invoiceBody}
              onChange={(e) => setEditor({ ...editor, invoiceBody: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("fields.emailSubject")}</span>
            <input
              className="w-full rounded-lg border border-ns-border px-3 py-2"
              value={editor.emailSubject}
              onChange={(e) => setEditor({ ...editor, emailSubject: e.target.value })}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("fields.emailBody")}</span>
            <textarea
              rows={8}
              className="w-full rounded-lg border border-ns-border px-3 py-2 text-sm"
              value={editor.emailBody}
              onChange={(e) => setEditor({ ...editor, emailBody: e.target.value })}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pending}
              onClick={() => void patchInvoice("regenerate_template")}
            >
              {t("actions.regenerate")}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pending}
              onClick={() =>
                void patchInvoice(undefined, { status: "ready_to_send" as BillingInvoiceStatus })
              }
            >
              {t("actions.markReady")}
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={pending}
              onClick={() => void patchInvoice()}
            >
              {pending ? t("saving") : t("actions.save")}
            </button>
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={pending}
              onClick={() => void patchInvoice("send_now")}
            >
              {t("actions.sendNow")}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pending}
              onClick={() => void patchInvoice("mark_paid")}
            >
              {t("actions.markPaid")}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pending}
              onClick={() => void patchInvoice("mark_follow_up")}
            >
              {t("actions.markFollowUp")}
            </button>
          </div>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
