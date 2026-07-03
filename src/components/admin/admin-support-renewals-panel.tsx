"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type RenewalRow = {
  userId: string;
  email: string;
  displayName: string | null;
  tier: string;
  contractEndAt: string;
  daysRemaining: number;
  monthlyAmount: number;
  currency: "eur" | "mxn";
  renewalStatus: string;
};

type Props = {
  embedded?: boolean;
};

export function AdminSupportRenewalsPanel({ embedded = false }: Props) {
  const t = useTranslations("adminSupportRenewals");
  const { user } = useAuth();
  const [rows, setRows] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/support-renewals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { renewals: RenewalRow[] };
      setRows(body.renewals ?? []);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(userId: string, action: "extend" | "not_renewing") {
    if (!user) return;
    setPendingId(userId);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/support-renewals", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
      if (!res.ok) {
        setError(body.detail ?? body.error ?? t("actionFailed"));
        return;
      }
      setMessage(action === "extend" ? t("extendedOk") : t("notRenewingOk"));
      await load();
    } catch {
      setError(t("actionFailed"));
    } finally {
      setPendingId(null);
    }
  }

  function formatEnd(iso: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
  }

  function amountLabel(row: RenewalRow): string {
    const sym = row.currency === "mxn" ? "MX$" : "€";
    return `${row.monthlyAmount} ${sym}`;
  }

  return (
    <AdminPanelShell embedded={embedded} tone="neutral">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>

      {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-ns-border bg-white px-4 py-6 text-sm text-ns-secondary">
          {t("empty")}
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => {
            const overdue = row.daysRemaining < 0;
            const urgent = row.daysRemaining <= 7;
            return (
              <li
                key={row.userId}
                className="rounded-xl border border-ns-border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ns-hero">
                      {row.displayName || row.email || row.userId}
                    </p>
                    <p className="mt-1 text-sm text-ns-secondary">
                      {t("endsOn", { date: formatEnd(row.contractEndAt) })} · {amountLabel(row)}
                      /{t("month")}
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        overdue
                          ? "text-red-700"
                          : urgent
                            ? "text-amber-800"
                            : "text-ns-secondary"
                      }`}
                    >
                      {overdue
                        ? t("overdue", { days: Math.abs(row.daysRemaining) })
                        : t("daysLeft", { days: row.daysRemaining })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={BTN_PRIMARY}
                      disabled={pendingId === row.userId}
                      onClick={() => void patch(row.userId, "extend")}
                    >
                      {pendingId === row.userId ? t("pending") : t("extend")}
                    </button>
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      disabled={pendingId === row.userId}
                      onClick={() => void patch(row.userId, "not_renewing")}
                    >
                      {t("notRenewing")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </AdminPanelShell>
  );
}
