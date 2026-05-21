"use client";

import { createClient } from "@/lib/clients/firestore";
import { useRouter } from "@/i18n/navigation";
import type { ContentLanguage } from "@/types/client";
import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

export function CreateClientForm({ userId }: { userId: string }) {
  const t = useTranslations("dashboard.clients.create");
  const tErr = useTranslations("dashboard.clients.create.errors");
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientTypeLabel, setClientTypeLabel] = useState("");
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>("en");
  const [sector, setSector] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const id = await createClient(userId, {
        name,
        clientTypeLabel,
        contentLanguage,
        sector: sector || undefined,
        notes: notes || undefined,
      });
      router.push(`/clients/${id}/onboarding`);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code === "permission-denied") {
        setError(tErr("permissionDenied"));
      } else if (code) {
        setError(tErr("withCode", { code }));
      } else {
        setError(tErr("generic"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4 rounded-2xl border border-gray-100 bg-ns-surface p-6">
      <h2 className="text-lg font-semibold text-ns-tertiary">{t("title")}</h2>
      <div>
        <label className="mb-1 block text-sm font-medium text-ns-tertiary" htmlFor="name">
          {t("name")}
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ns-tertiary" htmlFor="type">
          {t("typeLabel")}
        </label>
        <input
          id="type"
          required
          value={clientTypeLabel}
          onChange={(e) => setClientTypeLabel(e.target.value)}
          placeholder={t("typeLabelHint")}
          className="w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ns-tertiary" htmlFor="lang">
          {t("contentLanguage")}
        </label>
        <select
          id="lang"
          value={contentLanguage}
          onChange={(e) => setContentLanguage(e.target.value as ContentLanguage)}
          className="w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60"
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ns-tertiary" htmlFor="sector">
          {t("sector")}
        </label>
        <input
          id="sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ns-tertiary" htmlFor="notes">
          {t("notes")}
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
