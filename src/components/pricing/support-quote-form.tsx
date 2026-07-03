"use client";

import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import type { SupportQuotePlan } from "@/lib/email/send-support-quote";
import { INPUT_CLASS } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  plan: SupportQuotePlan;
  onClose?: () => void;
  submitClassName?: string;
  defaultEmail?: string;
};

export function SupportQuoteForm({ plan, onClose, submitClassName, defaultEmail = "" }: Props) {
  const t = useTranslations("pricing.support.quoteForm");
  const locale = useLocale();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [activityNeed, setActivityNeed] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SupportQuotePlan>(plan);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPlan(plan);
  }, [plan]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      const res = await fetch("/api/support/quote-request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          fullName,
          companyName,
          position,
          activityNeed,
          email,
          whatsapp,
          plan: selectedPlan,
          locale,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error === "not_configured") {
          setError(t("errors.notConfigured"));
        } else {
          setError(t("errors.generic"));
        }
        return;
      }

      setDone(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3 text-left">
        <p className="text-sm font-medium leading-relaxed text-ns-tertiary">{t("success")}</p>
        {onClose ? (
          <button type="button" onClick={onClose} className={`w-full ${BTN_SECONDARY}`}>
            {t("close")}
          </button>
        ) : null}
      </div>
    );
  }

  const fieldClass = `${INPUT_CLASS} py-2 text-sm`;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-2.5 text-left">
      {plan === "unspecified" ? (
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("plan")}</span>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as SupportQuotePlan)}
            className={fieldClass}
          >
            <option value="starter">{t("planStarter")}</option>
            <option value="regular">{t("planRegular")}</option>
            <option value="much_more">{t("planMuchMore")}</option>
            <option value="unspecified">{t("planUnspecified")}</option>
          </select>
        </label>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("fullName")}</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("company")}</span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={fieldClass}
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("position")}</span>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={fieldClass}
            autoComplete="organization-title"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("activityNeed")}</span>
        <textarea
          value={activityNeed}
          onChange={(e) => setActivityNeed(e.target.value)}
          rows={3}
          placeholder={t("activityNeedPlaceholder")}
          className={`${fieldClass} resize-y`}
        />
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("email")}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ns-secondary">{t("whatsapp")}</span>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder={t("whatsappPlaceholder")}
            className={fieldClass}
            autoComplete="tel"
          />
        </label>
      </div>

      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      <p className="rounded-xl border border-ns-primary/25 bg-ns-primary/5 px-3 py-2.5 text-xs leading-relaxed text-ns-secondary">
        {t("phoneCallNote")}
      </p>

      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className={`min-h-[2.75rem] flex-1 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${submitClassName ?? BTN_PRIMARY}`}
        >
          {pending ? t("pending") : t("submit")}
        </button>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className={`min-h-[2.75rem] rounded-xl px-4 py-2.5 text-sm font-bold ${BTN_SECONDARY}`}
          >
            {t("close")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
