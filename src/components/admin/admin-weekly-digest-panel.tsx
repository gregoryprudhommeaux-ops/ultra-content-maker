"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AdminWeeklyDigestPanelProps = {
  embedded?: boolean;
};

export function AdminWeeklyDigestPanel({ embedded = false }: AdminWeeklyDigestPanelProps) {
  const t = useTranslations("adminDigest");
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendDigest(dryRun: boolean) {
    if (!user) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch(
        `/api/admin/weekly-digest${dryRun ? "?dryRun=1" : ""}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        emailed?: boolean;
        payload?: { mrrUsd?: number };
      };
      if (!res.ok) {
        setError(body.error ?? t("error"));
        return;
      }
      if (dryRun) {
        setMessage(t("previewOk", { mrr: body.payload?.mrrUsd ?? 0 }));
      } else {
        setMessage(body.emailed ? t("sent") : t("sentNoEmail"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPanelShell embedded={embedded} tone="slate">
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={BTN_SECONDARY}
          disabled={pending}
          onClick={() => void sendDigest(false)}
        >
          {pending ? t("pending") : t("sendNow")}
        </button>
        <button
          type="button"
          className="rounded-lg border border-ns-border bg-white px-4 py-2 text-sm font-semibold text-ns-secondary hover:bg-ns-background disabled:opacity-60"
          disabled={pending}
          onClick={() => void sendDigest(true)}
        >
          {t("preview")}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
    </AdminPanelShell>
  );
}
