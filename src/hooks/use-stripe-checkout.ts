"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type Tier = "pro" | "pro_plus";

export function useStripeCheckout(tier: Tier) {
  const t = useTranslations("pricing.billing");
  const locale = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) {
        setError(t("authRequired"));
        return;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tier, locale }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error === "stripe_not_configured" ? t("notConfigured") : t("failed"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  }, [locale, t, tier, user]);

  return { startCheckout, loading, error, canCheckout: Boolean(user) };
}
