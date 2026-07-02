"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { getClientAuth } from "@/lib/firebase/client";
import { parseManagedAccountId } from "@/lib/workspace/managed-clients";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function UnlinkManagedClientButton() {
  const t = useTranslations("workspaceAccounts");
  const { user } = useAuth();
  const { activeAccount, canManageAccounts, switchAccount, reload } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = activeAccount ? parseManagedAccountId(activeAccount.id) : null;

  if (!canManageAccounts || !activeAccount?.isManaged || !parsed || !user) {
    return null;
  }

  async function onUnlink() {
    if (!parsed || !user) return;
    setBusy(true);
    setError(null);
    try {
      const auth = getClientAuth();
      const token = await auth?.currentUser?.getIdToken();
      if (!token) throw new Error("auth");

      const res = await fetch("/api/admin/managed-clients", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientUid: parsed.clientUid }),
      });
      if (!res.ok) throw new Error("api");

      setConfirming(false);
      await switchAccount(DEFAULT_ACCOUNT_ID);
      await reload();
    } catch {
      setError(t("unlinkClientFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {confirming ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2">
          <p className="text-xs text-white/80">
            {t("unlinkClientConfirm", { name: activeAccount.name })}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onUnlink()}
              className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? t("unlinkClientBusy") : t("unlinkClientConfirmYes")}
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
          className="w-full rounded-lg border border-amber-400/30 bg-amber-950/20 px-3 py-2 text-left text-xs font-semibold text-amber-200 hover:bg-amber-950/40"
        >
          {t("unlinkClientAccount")}
        </button>
      )}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
