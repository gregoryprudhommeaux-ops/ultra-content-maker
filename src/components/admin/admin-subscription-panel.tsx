"use client";

import { AdminPanelShell } from "@/components/admin/admin-cockpit-layout";
import { ADMIN_ASSIGNABLE_TIERS } from "@/components/admin/admin-user-tier-select";
import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useState } from "react";

type AdminSubscriptionPanelProps = {
  embedded?: boolean;
};

export function AdminSubscriptionPanel({ embedded = false }: AdminSubscriptionPanelProps) {
  const t = useTranslations("adminSubscription");
  const { user } = useAuth();
  const [userId, setUserId] = useState("");
  const [tier, setTier] = useState("pro_plus");
  const [bonusPosts, setBonusPosts] = useState("5");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!user || !userId.trim()) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/admin/subscription", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId.trim(),
          tier,
          bonusPosts: tier === "pro_plus" ? Number(bonusPosts) || 0 : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; profile?: { tier?: string } };
      if (!res.ok) {
        setError(body.error ?? t("error"));
        return;
      }
      setMessage(t("success", { tier: body.profile?.tier ?? tier }));
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminPanelShell embedded={embedded}>
      <h2 className="text-lg font-bold text-ns-tertiary">{t("title")}</h2>
      <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ns-tertiary">{t("userId")}</span>
          <input
            className="mt-1 w-full rounded-lg border border-ns-border px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Firebase UID"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ns-tertiary">{t("tier")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-ns-border px-3 py-2"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            {ADMIN_ASSIGNABLE_TIERS.map((tierOption) => (
              <option key={tierOption} value={tierOption}>
                {tierOption}
              </option>
            ))}
          </select>
        </label>
        {tier === "pro_plus" ? (
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-ns-tertiary">{t("bonusPosts")}</span>
            <input
              type="number"
              min={0}
              className="mt-1 w-full max-w-xs rounded-lg border border-ns-border px-3 py-2"
              value={bonusPosts}
              onChange={(e) => setBonusPosts(e.target.value)}
            />
          </label>
        ) : null}
      </div>
      <button type="button" className={`mt-4 ${BTN_PRIMARY}`} disabled={pending || !userId.trim()} onClick={submit}>
        {pending ? t("pending") : t("submit")}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-green-700">{message}</p> : null}
    </AdminPanelShell>
  );
}
