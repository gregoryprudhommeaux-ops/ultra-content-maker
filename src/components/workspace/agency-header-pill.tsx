"use client";

import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { requestOpenAccountSwitcher } from "@/lib/workspace/account-switcher-events";
import { useTranslations } from "next-intl";

type Props = {
  className?: string;
  /** Full-width bar under the logo row on narrow screens. */
  layout?: "inline" | "mobile-bar";
};

export function AgencyHeaderPill({ className = "", layout = "inline" }: Props) {
  const t = useTranslations("workspaceAccounts");
  const isPlatformAdmin = usePlatformAdmin();
  const { activeAccount, loading } = useWorkspace();

  if (!isPlatformAdmin || loading || !activeAccount?.isManaged) {
    return null;
  }

  const isMobileBar = layout === "mobile-bar";

  return (
    <button
      type="button"
      onClick={() => requestOpenAccountSwitcher()}
      title={t("agencySwitchAccount")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/55 bg-amber-500/15 text-left transition-colors hover:bg-amber-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        isMobileBar
          ? "w-full max-w-none justify-center px-3 py-1.5"
          : "max-w-[min(100%,10rem)] shrink-0 px-2.5 py-1 sm:max-w-[14rem]"
      } ${className}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
      <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
        {t("agencyHeaderPill", { name: activeAccount.name })}
      </span>
    </button>
  );
}

export function useAgencyManagedContext(): boolean {
  const isPlatformAdmin = usePlatformAdmin();
  const { activeAccount, loading } = useWorkspace();
  return Boolean(isPlatformAdmin && !loading && activeAccount?.isManaged);
}
