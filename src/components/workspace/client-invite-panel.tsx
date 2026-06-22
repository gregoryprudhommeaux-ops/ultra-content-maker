"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { getClientAuth } from "@/lib/firebase/client";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function ClientInvitePanel() {
  const t = useTranslations("workspaceAccounts");
  const locale = useLocale();
  const { user } = useAuth();
  const { activeAccount } = useWorkspace();
  const isPlatformAdmin = usePlatformAdmin();
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  if (
    !isPlatformAdmin ||
    !activeAccount ||
    !user ||
    activeAccount.id === DEFAULT_ACCOUNT_ID ||
    activeAccount.isDefault
  ) {
    return null;
  }

  async function onCopy() {
    if (!activeAccount || !user) return;
    setStatus("copying");
    try {
      const auth = getClientAuth();
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) throw new Error("auth");

      const res = await fetch("/api/admin/account-invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ accountId: activeAccount.id, locale }),
      });
      if (!res.ok) throw new Error("api");
      const data = (await res.json()) as { url: string };
      setInviteUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <section className="rounded-xl border border-ns-primary/35 bg-ns-primary/8 p-4 md:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ns-tertiary">
        {t("invitePanelTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ns-secondary">
        {t("invitePanelBody", { name: activeAccount.name })}
      </p>
      {inviteUrl ? (
        <p className="mt-3 break-all rounded-lg border border-ns-alternate/60 bg-white px-3 py-2 font-mono text-xs text-ns-tertiary">
          {inviteUrl}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void onCopy()}
        disabled={status === "copying"}
        className="mt-3 rounded-lg bg-ns-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ns-hero hover:opacity-90 disabled:opacity-60"
      >
        {status === "copied"
          ? t("inviteCopied")
          : status === "error"
            ? t("inviteCopyFailed")
            : status === "copying"
              ? t("inviteCopying")
              : t("copyInviteLink")}
      </button>
    </section>
  );
}
