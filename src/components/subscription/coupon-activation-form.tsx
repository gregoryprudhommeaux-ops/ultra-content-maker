"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { getClientAuth } from "@/lib/firebase/client";
import { BTN_PRIMARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  suggestedPlan?: "pro" | "pro_plus";
};

export function CouponActivationForm({ suggestedPlan }: Props) {
  const t = useTranslations("subscription.coupon");
  const { user } = useAuth();
  const { refresh } = useSubscription();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !code.trim()) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/subscription/redeem-coupon", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim(), suggestedPlan }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; tier?: string };
      if (!res.ok) {
        setError(body.error ? t(`errors.${body.error}` as "errors.invalid") : t("errors.generic"));
        return;
      }
      setMessage(t("success", { tier: body.tier ?? "" }));
      setCode("");
      await refresh();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("placeholder")}
        className={`${INPUT_CLASS} py-2.5 text-sm`}
        autoComplete="off"
      />
      <button type="submit" className={`${BTN_PRIMARY} w-full sm:w-auto`} disabled={pending || !code.trim()}>
        {pending ? t("pending") : t("submit")}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </form>
  );
}
