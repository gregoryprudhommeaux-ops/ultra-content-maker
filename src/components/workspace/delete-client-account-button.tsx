"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { getClientAuth } from "@/lib/firebase/client";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function DeleteClientAccountButton() {
  const t = useTranslations("workspaceAccounts");
  const { user } = useAuth();
  const { activeAccount, canManageAccounts, switchAccount, reload } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (
    !canManageAccounts ||
    !activeAccount ||
    !user ||
    activeAccount.id === DEFAULT_ACCOUNT_ID ||
    activeAccount.isDefault
  ) {
    return null;
  }

  async function onDelete() {
    if (!activeAccount || !user) return;
    setBusy(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const res = await fetch("/api/admin/workspace-accounts/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountId: activeAccount.id }),
      });
      if (!res.ok) throw new Error("api");

      setConfirming(false);
      await switchAccount(DEFAULT_ACCOUNT_ID);
      await reload();
    } catch {
      setError(t("deleteAccountFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {confirming ? (
        <div className="rounded-lg border border-red-400/40 bg-red-950/30 px-3 py-2">
          <p className="text-xs text-white/80">
            {t("deleteAccountConfirm", { name: activeAccount.name })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDelete()}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? t("deleteAccountBusy") : t("deleteAccountConfirmYes")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-white/70 hover:text-white"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="w-full rounded-lg border border-red-400/30 bg-red-950/20 px-3 py-2 text-left text-xs font-semibold text-red-300 hover:bg-red-950/40"
        >
          {t("deleteAccount")}
        </button>
      )}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
