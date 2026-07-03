"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import type { WireBankDetails } from "@/lib/billing/wire-config";
import type { WirePlan } from "@/lib/billing/wire-config";
import type { WireRequestRow } from "@/lib/billing/wire-requests.server";
import {
  WIRE_PLAN_AMOUNTS,
  type WirePaymentCurrency,
} from "@/lib/billing/wire-pricing";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  suggestedPlan?: WirePlan;
};

type BanksPayload = {
  mxn: WireBankDetails;
  eur: WireBankDetails;
};

function BankDetailsList({ bank, t }: { bank: WireBankDetails; t: ReturnType<typeof useTranslations> }) {
  const rowClass = "flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3";
  const labelClass = "shrink-0 text-sm font-semibold text-ns-tertiary sm:w-36";
  const valueClass = "text-base text-ns-secondary";

  if (bank.rail === "mx_clabe") {
    return (
      <ul className="mt-4 space-y-4">
        <li className={rowClass}>
          <span className={labelClass}>{t("entity")}</span>
          <span className={valueClass}>{bank.entity}</span>
        </li>
        <li className={rowClass}>
          <span className={labelClass}>{t("clabe")}</span>
          <code className="break-all rounded-lg border border-ns-border bg-white px-3 py-2 font-mono text-base font-semibold text-ns-hero">
            {bank.clabe}
          </code>
        </li>
        {bank.accountNumber ? (
          <li className={rowClass}>
            <span className={labelClass}>{t("accountNumber")}</span>
            <span className={`${valueClass} font-mono font-semibold`}>{bank.accountNumber}</span>
          </li>
        ) : null}
        <li className={rowClass}>
          <span className={labelClass}>{t("holder")}</span>
          <span className={valueClass}>{bank.accountHolder}</span>
        </li>
        <li className={rowClass}>
          <span className={labelClass}>{t("payIn", { currency: bank.currency })}</span>
        </li>
      </ul>
    );
  }

  return (
    <ul className="mt-4 space-y-4">
      <li className={rowClass}>
        <span className={labelClass}>{t("holder")}</span>
        <span className={valueClass}>{bank.accountHolder}</span>
      </li>
      <li className={rowClass}>
        <span className={labelClass}>IBAN</span>
        <code className="break-all rounded-lg border border-ns-border bg-white px-3 py-2 font-mono text-base font-semibold text-ns-hero">
          {bank.iban}
        </code>
      </li>
      <li className={rowClass}>
        <span className={labelClass}>BIC</span>
        <span className={`${valueClass} font-mono font-semibold`}>{bank.bic}</span>
      </li>
      {bank.bankName ? (
        <li className={rowClass}>
          <span className={labelClass}>{t("bank")}</span>
          <span className={valueClass}>{bank.bankName}</span>
        </li>
      ) : null}
      <li className={rowClass}>
        <span className={labelClass}>{t("payIn", { currency: bank.currency })}</span>
      </li>
    </ul>
  );
}

export function WireTransferForm({ suggestedPlan = "pro_plus" }: Props) {
  const t = useTranslations("subscription.wire");
  const locale = useLocale() as AppLocale;
  const { user } = useAuth();
  const [tier, setTier] = useState<WirePlan>(suggestedPlan);
  const [currency, setCurrency] = useState<WirePaymentCurrency>("eur");
  const [request, setRequest] = useState<WireRequestRow | null>(null);
  const [banks, setBanks] = useState<BanksPayload | null>(null);
  const [userNote, setUserNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeCurrency = request?.currency ?? currency;
  const bank = useMemo(() => {
    if (!banks) return null;
    return activeCurrency === "mxn" ? banks.mxn : banks.eur;
  }, [banks, activeCurrency]);

  const amountLabel = WIRE_PLAN_AMOUNTS[tier][activeCurrency].label;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("auth");
      const res = await fetch(
        `/api/billing/wire-request?tier=${tier}&currency=${currency}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body = (await res.json().catch(() => ({}))) as {
        request?: WireRequestRow | null;
        bank?: WireBankDetails;
        banks?: BanksPayload;
        error?: string;
      };
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      setRequest(body.request ?? null);
      if (body.banks) {
        setBanks(body.banks);
      } else if (body.bank) {
        setBanks(
          body.bank.rail === "mx_clabe"
            ? { mxn: body.bank, eur: body.bank }
            : { mxn: body.bank, eur: body.bank },
        );
      }
      if (body.request?.currency) {
        setCurrency(body.request.currency);
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [user, tier, currency, t]);

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
          currency,
          userEmail: user.email,
          displayName: user.displayName ?? undefined,
          locale,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        request?: WireRequestRow;
        banks?: BanksPayload;
        error?: string;
      };
      if (!res.ok) {
        setError(t("errors.generic"));
        return;
      }
      setRequest(body.request ?? null);
      if (body.banks) setBanks(body.banks);
      if (body.request?.currency) setCurrency(body.request.currency);
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

  const transferMemo = request?.transferMemo ?? null;

  async function changeCurrency(next: WirePaymentCurrency) {
    if (next === activeCurrency) return;
    setCurrency(next);
    if (!request || request.status !== "pending") return;

    setPending(true);
    setError(null);
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
        body: JSON.stringify({ requestId: request.id, currency: next }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        request?: WireRequestRow;
        banks?: BanksPayload;
      };
      if (!res.ok) {
        setError(t("errors.generic"));
        setCurrency(activeCurrency);
        return;
      }
      if (body.request) setRequest(body.request);
      if (body.banks) setBanks(body.banks);
    } catch {
      setError(t("errors.generic"));
      setCurrency(activeCurrency);
    } finally {
      setPending(false);
    }
  }

  const currencyLocked =
    request?.status === "wire_sent" ||
    request?.status === "approved" ||
    request?.status === "rejected";

  if (!user) {
    return <p className="text-sm text-ns-secondary">{t("loginRequired")}</p>;
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {(["pro", "pro_plus"] as const).map((plan) => (
          <button
            key={plan}
            type="button"
            onClick={() => setTier(plan)}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
              tier === plan
                ? "bg-ns-primary text-white"
                : "border border-ns-border bg-white text-ns-secondary"
            }`}
          >
            {plan === "pro" ? "Pro" : "Pro+"}
          </button>
        ))}
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ns-secondary">
          {t("currencyLabel")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["eur", "mxn"] as const).map((c) => (
            <button
              key={c}
              type="button"
              disabled={currencyLocked || pending}
              onClick={() => void changeCurrency(c)}
              className={`rounded-xl px-5 py-4 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                activeCurrency === c
                  ? "border-2 border-ns-primary bg-ns-primary/10 text-ns-tertiary"
                  : "border border-ns-border bg-white text-ns-secondary"
              }`}
            >
              <span className="block text-base">
                {c === "eur" ? t("currencyEur") : t("currencyMxn")}
              </span>
              <span className="mt-1 block text-lg font-bold">
                {WIRE_PLAN_AMOUNTS[tier][c].label}
                {t("perMonth")}
              </span>
            </button>
          ))}
        </div>
      </div>

      {!request ? (
        <div className="rounded-2xl border border-ns-border bg-ns-background/60 p-5 text-sm text-ns-secondary md:p-6">
          <p>{t("intro", { amount: amountLabel })}</p>
          <p className="mt-2 text-xs">{t("graceNote")}</p>
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
        <div className="rounded-2xl border-2 border-ns-primary/40 bg-ns-primary/5 p-5 md:p-8">
          {request.status === "approved" ? (
            <p className="font-semibold text-green-800">{t("approved")}</p>
          ) : request.status === "rejected" ? (
            <p className="font-semibold text-rose-700">{t("rejected")}</p>
          ) : (
            <>
              <p className="text-lg font-bold text-ns-tertiary">{t("bankTitle")}</p>

              {bank?.configured ? (
                <div className="mt-4 rounded-xl border border-white/80 bg-white p-5 shadow-sm md:p-6">
                  <BankDetailsList bank={bank} t={t} />
                  <p className="mt-6 border-t border-ns-border pt-4 text-base text-ns-secondary">
                    <span className="font-semibold text-ns-tertiary">{t("amount")}:</span>{" "}
                    <span className="text-lg font-bold text-ns-hero">{amountLabel}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {t("bankNotConfigured")}
                </p>
              )}

              <div className="mt-6 rounded-xl border border-ns-primary/30 bg-white p-5 md:p-6">
                <p className="text-sm font-semibold text-ns-tertiary">{t("memoHint")}</p>
                {transferMemo ? (
                  <p className="mt-3">
                    <span className="text-sm font-semibold text-ns-tertiary">{t("memo")}</span>
                    <code className="mt-2 block break-all rounded-lg border border-ns-border bg-ns-background px-4 py-3 font-mono text-base font-semibold leading-relaxed text-ns-hero">
                      {transferMemo}
                    </code>
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-ns-secondary">
                  {t("userIdHint", { uid: user.uid.slice(0, 8) })}
                </p>
              </div>

              {request.status === "wire_sent" ? (
                <p className="mt-6 font-medium text-amber-800">{t("awaitingActivation")}</p>
              ) : (
                <div className="mt-6 space-y-4">
                  <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder={t("notePlaceholder")}
                    rows={2}
                    className={`${INPUT_CLASS} text-sm`}
                  />
                  <button
                    type="button"
                    className={`${BTN_SECONDARY} w-full sm:w-auto`}
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
