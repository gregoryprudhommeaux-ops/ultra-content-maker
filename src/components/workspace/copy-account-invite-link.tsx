"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { getClientAuth } from "@/lib/firebase/client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function CopyAccountInviteLink() {
  const t = useTranslations("workspaceAccounts");
  const locale = useLocale();
  const { user } = useAuth();
  const { activeAccount, canManageAccounts } = useWorkspace();
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");

  if (!canManageAccounts || !activeAccount || !user) return null;

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
      await navigator.clipboard.writeText(data.url);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      disabled={status === "copying"}
      className="mt-2 w-full rounded-lg border border-ns-primary/30 bg-ns-primary/10 px-3 py-2 text-left text-xs font-semibold text-ns-primary hover:bg-ns-primary/20 disabled:opacity-60"
    >
      {status === "copied"
        ? t("inviteCopied")
        : status === "error"
          ? t("inviteCopyFailed")
          : status === "copying"
            ? t("inviteCopying")
            : t("copyInviteLink")}
    </button>
  );
}
