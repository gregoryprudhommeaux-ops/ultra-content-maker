"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import {
  getSubscriptionProfileClient,
  subscribeSubscriptionProfile,
} from "@/lib/subscription/subscription.client";
import { resolveSubscriptionAccess } from "@/lib/subscription/access";
import { getUserDoc } from "@/lib/workspace/user";
import type { SubscriptionAccess, SubscriptionProfile } from "@/types/subscription";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SubscriptionContextValue = {
  profile: SubscriptionProfile | null;
  access: SubscriptionAccess | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  profile: null,
  access: null,
  loading: true,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isPlatformAdmin = usePlatformAdmin();
  const [profile, setProfile] = useState<SubscriptionProfile | null>(null);
  const [hasLinkedWorkspace, setHasLinkedWorkspace] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const [sub, userDoc] = await Promise.all([
      getSubscriptionProfileClient(user.uid),
      getUserDoc(user.uid),
    ]);
    setProfile(sub);
    setHasLinkedWorkspace(Boolean(userDoc?.linkedWorkspace?.ownerId));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    getUserDoc(user.uid)
      .then((doc) => {
        setHasLinkedWorkspace(Boolean(doc?.linkedWorkspace?.ownerId));
        unsub = subscribeSubscriptionProfile(user.uid, setProfile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => unsub?.();
  }, [user, authLoading]);

  const access = useMemo(() => {
    if (!profile) return null;
    return resolveSubscriptionAccess(profile, {
      isPlatformAdmin,
      hasLinkedWorkspace,
    });
  }, [profile, isPlatformAdmin, hasLinkedWorkspace]);

  const value = useMemo(
    () => ({ profile, access, loading: authLoading || loading, refresh }),
    [profile, access, authLoading, loading, refresh],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
