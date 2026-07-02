"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

export function useStripePortal() {
  const t = useTranslations("pricing.billing");
  const locale = useLocale();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
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
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        if (data.error === "no_stripe_customer") {
          setError(t("noCustomer"));
        } else if (data.error === "stripe_not_configured") {
          setError(t("notConfigured"));
        } else {
          setError(t("portalFailed"));
        }
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("portalFailed"));
    } finally {
      setLoading(false);
    }
  }, [locale, t, user]);

  return { openPortal, loading, error, canOpenPortal: Boolean(user) };
}
