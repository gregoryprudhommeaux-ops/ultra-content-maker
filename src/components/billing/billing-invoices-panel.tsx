"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { BillingInvoiceRow } from "@/lib/billing/wire-billing";
import { formatInvoiceAmount } from "@/lib/billing/wire-billing";
import { CARD_SOFT } from "@/lib/ui/nextstep";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

function formatPeriodMonth(monthKey: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    d,
  );
}

export function BillingInvoicesPanel() {
  const t = useTranslations("setup.llm.invoices");
  const locale = useLocale();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/billing/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { invoices?: BillingInvoiceRow[] };
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

  if (!user) return null;

  return (
    <section className={CARD_SOFT}>
      <header className="mb-1">
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </header>

      {loading ? <p className="text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && invoices.length === 0 ? (
        <p className="text-sm text-ns-secondary">{t("empty")}</p>
      ) : null}

      {!loading && invoices.some((i) => i.status === "pending") ? (
        <p className="mt-2 text-xs text-amber-800">{t("pendingHint")}</p>
      ) : null}

      {!loading && invoices.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ns-secondary">
                <th className="px-2 py-2">{t("columns.period")}</th>
                <th className="px-2 py-2">{t("columns.tier")}</th>
                <th className="px-2 py-2">{t("columns.amount")}</th>
                <th className="px-2 py-2">{t("columns.status")}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-2 py-2">{formatPeriodMonth(row.periodMonth, locale)}</td>
                  <td className="px-2 py-2">{row.tier === "pro_plus" ? "Pro+" : "Pro"}</td>
                  <td className="px-2 py-2 tabular-nums">
                    {formatInvoiceAmount(row.currency, row.amount)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={
                        row.status === "paid"
                          ? "text-green-700"
                          : row.status === "pending"
                            ? "text-amber-700"
                            : "text-ns-secondary"
                      }
                    >
                      {t(`status.${row.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
