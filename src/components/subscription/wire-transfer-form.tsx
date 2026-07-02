"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { WireBankDetails } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config";
import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import { PRICING } from "@/lib/subscription/constants";
import { formatUsdAmount } from "@/lib/subscription/format-usd-price";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

type Props = {
  suggestedPlan?: WirePlan;
};

export function WireTransferForm({ suggestedPlan = "pro_plus" }: Props) {
  const t = useTranslations("subscription.wire");
  const locale = useLocale() as AppLocale;
  const { user } = useAuth();
  const [tier, setTier] = useState<WirePlan>(suggestedPlan);
  const [request, setRequest] = useState<WireRequestRow | null>(null);
  const [bank, setBank] = useState<WireBankDetails | null>(null);
  const [userNote, setUserNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch(`/api/billing/wire-request?tier=${tier}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        request?: WireRequestRow | null;
        bank?: WireBankDetails;
        error?: string;
      };
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      setRequest(body.request ?? null);
      setBank(body.bank ?? null);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [user, tier, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTier(suggestedPlan);
  }, [suggestedPlan]);

  async function createRequest() {
    if (!user?.email) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/billing/wire-request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier,
          userEmail: user.email,
          displayName: user.displayName ?? undefined,
          locale,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        request?: WireRequestRow;
        bank?: WireBankDetails;
        error?: string;
      };
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      setRequest(body.request ?? null);
      setBank(body.bank ?? null);
      setMessage(t("requestCreated"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function confirmWireSent() {
    if (!request) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch("/api/billing/wire-request", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId: request.id, userNote: userNote.trim() || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as { request?: WireRequestRow };
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      setRequest(body.request ?? request);
      setMessage(t("wireSent"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  const amount =
    tier === "pro" ? PRICING.pro.usdMonthly : PRICING.proPlus.usdMonthly;

  if (!user) {
    return <p className="text-sm text-ns-secondary">{t("loginRequired")}</p>;
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">{t("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pro", "pro_plus"] as const).map((plan) => (
          <button
            key={plan}
            type="button"
            onClick={() => setTier(plan)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tier === plan
                ? "bg-ns-primary text-white"
                : "border border-ns-border bg-white text-ns-secondary"
            }`}
          >
            {plan === "pro" ? "Pro" : "Pro+"} ·{" "}
            {formatUsdAmount(
              plan === "pro" ? PRICING.pro.usdMonthly : PRICING.proPlus.usdMonthly,
              locale,
            )}
            {t("perMonth")}
          </button>
        ))}
      </div>

      {!request ? (
        <div className="rounded-xl border border-ns-border bg-ns-background/60 p-4 text-sm text-ns-secondary">
          <p>{t("intro", { amount: formatUsdAmount(amount, locale) })}</p>
          <button
            type="button"
            className={`mt-4 ${BTN_PRIMARY}`}
            disabled={pending}
            onClick={() => void createRequest()}
          >
            {pending ? t("pending") : t("getBankDetails")}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-ns-primary/30 bg-ns-primary/5 p-4 text-sm">
          {request.status === "approved" ? (
            <p className="font-semibold text-green-800">{t("approved")}</p>
          ) : request.status === "rejected" ? (
            <p className="font-semibold text-rose-700">{t("rejected")}</p>
          ) : (
            <>
              <p className="font-semibold text-ns-tertiary">{t("bankTitle")}</p>
              {bank?.configured ? (
                <ul className="mt-3 space-y-1.5 text-ns-secondary">
                  <li>
                    <span className="font-medium text-ns-tertiary">{t("holder")}:</span>{" "}
                    {bank.accountHolder}
                  </li>
                  <li>
                    <span className="font-medium text-ns-tertiary">IBAN:</span> {bank.iban}
                  </li>
                  <li>
                    <span className="font-medium text-ns-tertiary">BIC:</span> {bank.bic}
                  </li>
                  {bank.bankName ? (
                    <li>
                      <span className="font-medium text-ns-tertiary">{t("bank")}:</span>{" "}
                      {bank.bankName}
                    </li>
                  ) : null}
                  <li>
                    <span className="font-medium text-ns-tertiary">{t("amount")}:</span>{" "}
                    {formatUsdAmount(request.amountUsd, locale)} USD
                    {bank.currency !== "USD" ? ` (${t("payIn", { currency: bank.currency })})` : ""}
                  </li>
                  <li className="pt-1">
                    <span className="font-medium text-ns-tertiary">{t("reference")}:</span>{" "}
                    <code className="rounded bg-white px-2 py-0.5 font-mono text-ns-hero">
                      {request.reference}
                    </code>
                  </li>
                </ul>
              ) : (
                <p className="mt-2 text-ns-secondary">{t("bankNotConfigured")}</p>
              )}
              <p className="mt-3 text-xs text-ns-secondary">{t("referenceHint")}</p>

              {request.status === "wire_sent" ? (
                <p className="mt-4 font-medium text-amber-800">{t("awaitingActivation")}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    rows={2}
                    className={`${INPUT_CLASS} text-sm`}
                  />
                  <button
                    type="button"
                    className={BTN_SECONDARY}
                    disabled={pending}
                    onClick={() => void confirmWireSent()}
                  >
                    {pending ? t("pending") : t("confirmWire")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </div>
  );
}
