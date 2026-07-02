"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type AdminWireRequestsPanelProps = {
  embedded?: boolean;
};

export function AdminWireRequestsPanel({ embedded = false }: AdminWireRequestsPanelProps) {
  const t = useTranslations("adminWire");
  const { user } = useAuth();
  const [requests, setRequests] = useState<WireRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;
      const res = await fetch("/api/admin/wire-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(t("loadFailed"));
        return;
      }
      const body = (await res.json()) as { requests: WireRequestRow[] };
      setRequests(body.requests ?? []);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(requestId: string, action: "approve" | "reject") {
    if (!user) return;
    setPendingId(requestId);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/wire-requests", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId, action }),
      });
      if (!res.ok) {
        setError(t("actionFailed"));
        return;
      }
      await load();
    } catch {
      setError(t("actionFailed"));
    } finally {
      setPendingId(null);
    }
  }

  const open = requests.filter(
    (r) => r.status === "pending" || r.status === "wire_sent",
  );

  return (
    <AdminPanelShell embedded={embedded} tone="emerald">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>

      {loading ? <p className="mt-4 text-sm text-ns-secondary">{t("loading")}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {!loading && open.length === 0 ? (
        <p className="mt-4 text-sm text-ns-secondary">{t("empty")}</p>
      ) : null}

      {!loading && open.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-ns-secondary">
                <th className="px-2 py-2">{t("columns.user")}</th>
                <th className="px-2 py-2">{t("columns.tier")}</th>
                <th className="px-2 py-2">{t("columns.amount")}</th>
                <th className="px-2 py-2">{t("columns.reference")}</th>
                <th className="px-2 py-2">{t("columns.status")}</th>
                <th className="px-2 py-2">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {open.map((row) => (
                <tr key={row.id} className="border-t border-emerald-100">
                  <td className="px-2 py-2">
                    <div className="font-medium text-ns-hero">
                      {row.displayName ?? row.userEmail}
                    </div>
                    <div className="text-xs text-ns-secondary">{row.userId}</div>
                  </td>
                  <td className="px-2 py-2">{row.tier}</td>
                  <td className="px-2 py-2 tabular-nums">${row.amountUsd}</td>
                  <td className="px-2 py-2 font-mono text-xs">{row.reference}</td>
                  <td className="px-2 py-2">{t(`status.${row.status}`)}</td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${BTN_PRIMARY} !px-3 !py-1.5 text-xs`}
                        disabled={pendingId === row.id}
                        onClick={() => void resolve(row.id, "approve")}
                      >
                        {pendingId === row.id ? t("pending") : t("approve")}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-ns-border bg-white px-3 py-1.5 text-xs font-semibold text-ns-secondary hover:bg-ns-background"
                        disabled={pendingId === row.id}
                        onClick={() => void resolve(row.id, "reject")}
                      >
                        {t("reject")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminPanelShell>
  );
}
