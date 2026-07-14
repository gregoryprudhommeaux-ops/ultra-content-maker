"use client";

import { useSubscription } from "@/contexts/subscription-context";
import { useUpgradeModal } from "@/contexts/upgrade-modal-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { Link, usePathname } from "@/i18n/navigation";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

const ALLOWED_WHEN_EXPIRED = ["/upgrade", "/support", "/pricing"];

export function SubscriptionExpiredGuard({ children }: { children: ReactNode }) {
  const { access, loading } = useSubscription();
  const { openUpgradeModal } = useUpgradeModal();
  const isPlatformAdmin = usePlatformAdmin();
  const pathname = usePathname();
  const t = useTranslations("subscription.expired");
  const isWireOverdue = access?.blockReason === "wire_payment_overdue";

  const blocked =
    !loading &&
    !isPlatformAdmin &&
    Boolean(access?.isExpired) &&
    !ALLOWED_WHEN_EXPIRED.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    if (!blocked) return;
    openUpgradeModal({
      reason: isWireOverdue ? "wire_payment_overdue" : "trial_expired",
      plan: "pro_plus",
    });
  }, [blocked, isWireOverdue, openUpgradeModal]);

  if (loading || isPlatformAdmin) return <>{children}</>;
  if (!access?.isExpired) return <>{children}</>;

  const allowed = ALLOWED_WHEN_EXPIRED.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-ns-tertiary">
        {isWireOverdue ? t("wireOverdueTitle") : t("title")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ns-secondary">
        {isWireOverdue ? t("wireOverdueBody") : t("body")}
      </p>
      <p className="mt-2 text-xs text-ns-secondary">
        {isWireOverdue ? t("wireOverdueReassurance") : t("reassurance")}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() =>
            openUpgradeModal({
              reason: isWireOverdue ? "wire_payment_overdue" : "trial_expired",
              plan: "pro_plus",
            })
          }
          className={BTN_PRIMARY}
        >
          {t("upgrade")}
        </button>
        <Link href="/pricing" className={BTN_SECONDARY}>
          {t("pricing")}
        </Link>
      </div>
    </div>
  );
}
