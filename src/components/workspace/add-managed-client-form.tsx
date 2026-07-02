"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { getClientAuth } from "@/lib/firebase/client";
import { META_LABEL, INPUT_CLASS } from "@/lib/ui/nextstep";
import { ImeSafeInput } from "@/components/ui/ime-safe-field";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  onLinked?: () => void;
};

export function AddManagedClientForm({ onLinked }: Props) {
  const t = useTranslations("workspaceAccounts");
  const locale = useLocale();
  const { user } = useAuth();
  const { reload } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = email.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const res = await fetch("/api/admin/managed-clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { error?: string; client?: { displayName?: string } };
      if (!res.ok) {
        const code = data.error ?? "link_failed";
        throw new Error(code);
      }

      setSuccess(t(`linkClientSuccess.${data.client?.displayName ? "named" : "generic"}`, {
        name: data.client?.displayName ?? trimmed,
      }));
      setEmail("");
      setOpen(false);
      await reload();
      onLinked?.();
    } catch (err) {
      const code = err instanceof Error ? err.message : "link_failed";
      setError(t(`linkClientErrors.${code}`, { defaultValue: t("linkClientErrors.link_failed") }));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(null);
          setOpen(true);
        }}
        className="mt-2 w-full rounded-lg border border-ns-primary/35 bg-ns-primary/10 px-3 py-2 text-left text-xs font-semibold text-ns-primary hover:bg-ns-primary/15"
      >
        {t("linkClientAccount")}
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-2 space-y-2 rounded-lg border border-white/15 bg-white/5 px-3 py-3">
      <p className={`${META_LABEL} text-white/55`}>{t("linkClientHint")}</p>
      <label className={`${META_LABEL} block text-white/50`} htmlFor="managed-client-email">
        {t("linkClientEmail")}
      </label>
      <ImeSafeInput
        id="managed-client-email"
        type="email"
        className={`${INPUT_CLASS} !border-white/20 !bg-white/5 !text-white placeholder:!text-white/40`}
        value={email}
        onValueChange={setEmail}
        placeholder={t("linkClientEmailPlaceholder")}
        autoFocus
        lang={locale}
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="flex-1 rounded-md bg-ns-primary px-3 py-2 text-xs font-bold text-ns-hero hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("linkClientBusy") : t("linkClientSubmit")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-xs font-semibold text-white/60 hover:text-white"
        >
          {t("cancel")}
        </button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {success ? <p className="text-xs text-emerald-300">{success}</p> : null}
    </form>
  );
}
