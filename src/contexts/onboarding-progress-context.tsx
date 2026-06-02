"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  loadOnboardingProgress,
  type OnboardingProgress,
} from "@/lib/workspace/onboarding-progress";
import {
  getOnboardingStatusFromProgress,
  type OnboardingStatus,
} from "@/lib/workspace/onboarding-status";
import { usePathname } from "@/i18n/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const CHANGED_EVENT = "onboarding-progress-changed";

type OnboardingProgressContextValue = {
  progress: OnboardingProgress | null;
  /** Derived from progress — single source for guards, /start hub, nav. */
  status: OnboardingStatus | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const OnboardingProgressContext =
  createContext<OnboardingProgressContextValue | null>(null);

/** Call after any onboarding step is saved so the stepper refreshes. */
export function notifyOnboardingProgressChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }
}

export function OnboardingProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setProgress(null);
      setLoading(false);
      return;
    }
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    try {
      const data = await loadOnboardingProgress(user.uid, pathname);
      setProgress(data);
    } catch {
      if (!silent) {
        setProgress(null);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [user, pathname]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onChanged = () => void reload({ silent: true });
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGED_EVENT, onChanged);
  }, [reload]);

  const status = progress ? getOnboardingStatusFromProgress(progress) : null;

  return (
    <OnboardingProgressContext.Provider
      value={{ progress, status, loading, reload }}
    >
      {children}
    </OnboardingProgressContext.Provider>
  );
}

export function useOnboardingProgress(): OnboardingProgressContextValue {
  const ctx = useContext(OnboardingProgressContext);
  if (!ctx) {
    throw new Error("useOnboardingProgress must be used within OnboardingProgressProvider");
  }
  return ctx;
}
