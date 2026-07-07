"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { requestOpenAccountSwitcher } from "@/lib/workspace/account-switcher-events";
import { useTranslations } from "next-intl";

export function AgencyWorkspaceBanner() {
  const t = useTranslations("workspaceAccounts");
  const isPlatformAdmin = usePlatformAdmin();
  const { activeAccount, loading } = useWorkspace();

  if (!isPlatformAdmin || loading || !activeAccount?.isManaged) {
    return null;
  }

  const email = activeAccount.managedClientEmail ?? "";

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-50/90 to-white px-4 py-4 shadow-[inset_4px_0_0_0_#f59e0b] md:px-5 md:py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">
            {t("agencyManagedContext")}
          </p>
          <p className="mt-1 text-xl font-bold leading-tight text-ns-hero md:text-2xl">
            {activeAccount.name}
          </p>
          {email ? (
            <p className="mt-1 truncate text-sm font-medium text-amber-950/70">{email}</p>
          ) : null}
          <p className="mt-2 max-w-2xl text-sm text-ns-secondary">{t("agencyBannerSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => requestOpenAccountSwitcher()}
          className="shrink-0 rounded-lg border border-amber-400/60 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-950 transition-colors hover:border-amber-500 hover:bg-amber-50"
        >
          {t("agencySwitchAccount")}
        </button>
      </div>
    </div>
  );
}
