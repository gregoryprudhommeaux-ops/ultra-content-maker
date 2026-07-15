"use client";

import type { AdminUserMetrics } from "@/lib/admin/analytics-types";
import { getClientAuth } from "@/lib/firebase/client";
import { managedAccountId } from "@/lib/workspace/managed-clients";
import { DEFAULT_ACCOUNT_ID } from "@/lib/workspace/workspace-scope";
import { useWorkspace } from "@/contexts/workspace-context";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";

type Labels = {
  control: string;
  takeover: string;
  confirmControl: string;
  confirmTakeover: string;
  confirmAction: string;
  confirmReleaseAction: string;
  controlling: string;
  controlSuccess: string;
  release: string;
  confirmRelease: string;
  releasing: string;
  releaseSuccess: string;
  openWorkspace: string;
  managedByYou: string;
  managedByOther: string;
  cannotControlAdmin: string;
  cannotControlSelf: string;
  controlFailed: string;
  controlErrors: Record<string, string>;
  cancel: string;
};

type Props = {
  user: AdminUserMetrics;
  currentAdminUserId: string;
  labels: Labels;
  onChanged?: () => void;
};

function resolveManagedSwitcherId(user: AdminUserMetrics): string {
  const accountId = user.managedClientAccountId?.trim() || DEFAULT_ACCOUNT_ID;
  return managedAccountId(user.userId, accountId);
}

export function AdminUserControlAction({
  user,
  currentAdminUserId,
  labels,
  onChanged,
}: Props) {
  const locale = useLocale();
  const { reload, switchAccount, accounts } = useWorkspace();
  const [mode, setMode] = useState<"idle" | "confirm-control" | "confirm-release">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [linkedLocally, setLinkedLocally] = useState(false);

  const managedInSwitcher = useMemo(
    () =>
      accounts.some(
        (account) =>
          account.isManaged && account.managedClientUid === user.userId,
      ),
    [accounts, user.userId],
  );

  const isSelf = user.userId === currentAdminUserId;
  const managedBy = user.managedByAdminUid;
  const managedByYou =
    linkedLocally ||
    managedInSwitcher ||
    managedBy === currentAdminUserId;
  const managedByOther = Boolean(managedBy && managedBy !== currentAdminUserId && !managedByYou);

  if (isSelf) {
    return <span className="text-xs text-ns-alternate">{labels.cannotControlSelf}</span>;
  }
  if (user.isPlatformAdmin) {
    return <span className="text-xs text-ns-alternate">{labels.cannotControlAdmin}</span>;
  }

  function resolveControlError(code: string): string {
    return labels.controlErrors[code] ?? labels.controlFailed;
  }

  async function hardReloadIntoWorkspace(ownerUid: string) {
    const path = await resolveLandingPath(ownerUid);
    const href = `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
    window.location.assign(href);
  }

  async function runControl() {
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
        body: JSON.stringify({ userId: user.userId }),
      });
      const data = (await res.json()) as { error?: string; client?: { accountId?: string } };
      if (!res.ok) throw new Error(data.error ?? "control_failed");

      setLinkedLocally(true);
      setMode("idle");
      setSuccess(labels.controlSuccess);
      onChanged?.();

      try {
        await reload();
        const switcherId = managedAccountId(
          user.userId,
          data.client?.accountId?.trim() || user.managedClientAccountId || DEFAULT_ACCOUNT_ID,
        );
        await switchAccount(switcherId);
        await hardReloadIntoWorkspace(currentAdminUserId);
        return;
      } catch {
        /* link succeeded; workspace switch is best-effort */
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "control_failed";
      setError(resolveControlError(code));
    } finally {
      setBusy(false);
    }
  }

  async function runRelease() {
    setBusy(true);
    setError(null);
    setSuccess(null);
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
        body: JSON.stringify({ clientUid: user.userId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "release_failed");

      setLinkedLocally(false);
      await reload();
      setMode("idle");
      setSuccess(labels.releaseSuccess);
      onChanged?.();
    } catch (err) {
      const code = err instanceof Error ? err.message : "release_failed";
      setError(resolveControlError(code));
    } finally {
      setBusy(false);
    }
  }

  async function openWorkspace() {
    setBusy(true);
    setError(null);
    try {
      await reload();
      await switchAccount(resolveManagedSwitcherId(user));
      await hardReloadIntoWorkspace(currentAdminUserId);
    } catch {
      setError(labels.controlFailed);
      setBusy(false);
    }
  }

  if (mode === "confirm-control") {
    return (
      <div className="flex min-w-[13rem] max-w-[16rem] flex-col gap-1.5 rounded-md border border-ns-alternate/60 bg-white p-2 shadow-sm">
        <p className="text-[11px] leading-snug text-ns-secondary">
          {managedByOther ? labels.confirmTakeover : labels.confirmControl}
        </p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runControl()}
            className="rounded-md bg-ns-hero px-2 py-1 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? labels.controlling : labels.confirmAction}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("idle")}
            className="rounded-md border border-ns-alternate px-2 py-1 text-[11px] font-semibold text-ns-secondary hover:bg-white"
          >
            {labels.cancel}
          </button>
        </div>
        {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  if (mode === "confirm-release") {
    return (
      <div className="flex min-w-[13rem] max-w-[16rem] flex-col gap-1.5 rounded-md border border-ns-alternate/60 bg-white p-2 shadow-sm">
        <p className="text-[11px] leading-snug text-ns-secondary">{labels.confirmRelease}</p>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runRelease()}
            className="rounded-md border border-amber-600 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
          >
            {busy ? labels.releasing : labels.confirmReleaseAction}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setMode("idle")}
            className="rounded-md border border-ns-alternate px-2 py-1 text-[11px] font-semibold text-ns-secondary hover:bg-white"
          >
            {labels.cancel}
          </button>
        </div>
        {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-[9rem] max-w-[14rem] flex-col gap-1">
      {managedByYou ? (
        <>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {labels.managedByYou}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void openWorkspace()}
            className="text-left text-xs font-semibold text-ns-primary hover:underline disabled:opacity-50"
          >
            {labels.openWorkspace}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setSuccess(null);
              setMode("confirm-release");
            }}
            className="text-left text-xs font-semibold text-amber-800 hover:underline disabled:opacity-50"
          >
            {labels.release}
          </button>
        </>
      ) : (
        <>
          {managedByOther ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {labels.managedByOther}
            </span>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setSuccess(null);
              setMode("confirm-control");
            }}
            className="rounded-md border border-ns-hero/40 bg-ns-hero/5 px-2 py-1 text-left text-xs font-semibold text-ns-primary hover:bg-ns-hero/10 disabled:opacity-50"
          >
            {managedByOther ? labels.takeover : labels.control}
          </button>
        </>
      )}
      {success ? <p className="text-[11px] text-emerald-700">{success}</p> : null}
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
