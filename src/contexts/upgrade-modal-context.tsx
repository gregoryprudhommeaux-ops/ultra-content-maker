"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type UpgradeModalReason =
  | "trial_posts_exhausted"
  | "trial_expired"
  | "subscription_expired"
  | "pro_cap"
  | "pro_plus_cap"
  | "article_feedback_limit"
  | "premium_required"
  | "wire_payment_overdue"
  | "generic";

export type UpgradeRecommendedPlan = "pro" | "pro_plus";

export type UpgradeModalOpenOptions = {
  reason?: UpgradeModalReason;
  /** Override recommended plan card; otherwise inferred from reason. */
  plan?: UpgradeRecommendedPlan;
};

type UpgradeModalContextValue = {
  open: boolean;
  reason: UpgradeModalReason;
  plan: UpgradeRecommendedPlan;
  openUpgradeModal: (opts?: UpgradeModalOpenOptions) => void;
  closeUpgradeModal: () => void;
};

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

const UPGRADE_ERROR_CODES = new Set([
  "pro_cap",
  "pro_plus_cap",
  "subscription_expired",
  "trial_posts_exhausted",
  "trial_expired",
  "premium_required",
  "article_feedback_limit",
  "wire_payment_overdue",
]);

export function isUpgradePaywallError(code: string | undefined | null): boolean {
  if (!code) return false;
  return UPGRADE_ERROR_CODES.has(code.trim());
}

export function reasonFromErrorCode(code: string): UpgradeModalReason {
  const c = code.trim();
  if (c === "pro_cap") return "pro_cap";
  if (c === "pro_plus_cap") return "pro_plus_cap";
  if (c === "subscription_expired") return "subscription_expired";
  if (c === "trial_posts_exhausted") return "trial_posts_exhausted";
  if (c === "trial_expired") return "trial_expired";
  if (c === "premium_required") return "premium_required";
  if (c === "article_feedback_limit") return "article_feedback_limit";
  if (c === "wire_payment_overdue") return "wire_payment_overdue";
  return "generic";
}

function planFromReason(reason: UpgradeModalReason): UpgradeRecommendedPlan {
  if (reason === "pro_cap") return "pro_plus";
  if (reason === "pro_plus_cap") return "pro_plus";
  // Trial / expired / feedback / premium → Pro+ (platform AI, popular)
  return "pro_plus";
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<UpgradeModalReason>("generic");
  const [plan, setPlan] = useState<UpgradeRecommendedPlan>("pro_plus");

  const openUpgradeModal = useCallback((opts?: UpgradeModalOpenOptions) => {
    const nextReason = opts?.reason ?? "generic";
    setReason(nextReason);
    setPlan(opts?.plan ?? planFromReason(nextReason));
    setOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      open,
      reason,
      plan,
      openUpgradeModal,
      closeUpgradeModal,
    }),
    [open, reason, plan, openUpgradeModal, closeUpgradeModal],
  );

  return (
    <UpgradeModalContext.Provider value={value}>{children}</UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal(): UpgradeModalContextValue {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) {
    throw new Error("useUpgradeModal must be used within UpgradeModalProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (optional soft upgrade CTAs). */
export function useUpgradeModalOptional(): UpgradeModalContextValue | null {
  return useContext(UpgradeModalContext);
}
