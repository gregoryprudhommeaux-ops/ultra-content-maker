"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
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
 useRef,
 useState,
 type ReactNode,
} from "react";

const CHANGED_EVENT = "onboarding-progress-changed";

type OnboardingProgressContextValue = {
 progress: OnboardingProgress | null;
 /** Derived from progress · single source for guards, /start hub, nav. */
 status: OnboardingStatus | null;
 loading: boolean;
 reload: (options?: { silent?: boolean }) => Promise<void>;
};

const OnboardingProgressContext =
 createContext<OnboardingProgressContextValue | null>(null);

const DEFAULT_NOTIFY_DEFER_MS = 1500;

/** Call after any onboarding step is saved so the stepper refreshes. */
export function notifyOnboardingProgressChanged() {
 if (typeof window !== "undefined") {
 window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
 }
}

/**
 * Defer progress refresh until navigation or local UI state has settled · use
 * after long async flows (post generation, batch create) that must not unmount
 * wizards or hub lists via guard spinners.
 */
export function notifyOnboardingProgressChangedDeferred(
 ms = DEFAULT_NOTIFY_DEFER_MS,
) {
 if (typeof window === "undefined") return;
 window.setTimeout(() => notifyOnboardingProgressChanged(), ms);
}

export function OnboardingProgressProvider({ children }: { children: ReactNode }) {
 const { user } = useAuth();
 const { scope } = useWorkspace();
 const pathname = usePathname();
 const [progress, setProgress] = useState<OnboardingProgress | null>(null);
 const [loading, setLoading] = useState(true);
 const hasLoadedProgressRef = useRef(false);

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
    const data = await loadOnboardingProgress(scope?.ownerId ?? user.uid, pathname);
 setProgress(data);
 hasLoadedProgressRef.current = true;
 } catch {
 if (!silent) {
 setProgress(null);
 }
 } finally {
 if (!silent) {
 setLoading(false);
 }
 }
 }, [user, pathname, scope?.ownerId, scope?.accountId]);

 useEffect(() => {
 void reload({ silent: hasLoadedProgressRef.current });
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
