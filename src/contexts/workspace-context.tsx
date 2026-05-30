"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  bootstrapWorkspaceAccounts,
  createWorkspaceAccount,
  switchWorkspaceAccount,
  type WorkspaceAccount,
  type WorkspaceBootstrapResult,
} from "@/lib/workspace/accounts";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { isPlatformAdminEmail } from "@/lib/workspace/platform-admin";
import { resolveUserEmail } from "@/lib/workspace/resolve-user-email";
import type { ContentLanguage } from "@/types/workspace";
import { DEFAULT_ACCOUNT_ID, setActiveWorkspaceScope, type WorkspaceScope } from "@/lib/workspace/workspace-scope";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WorkspaceContextValue = {
  scope: WorkspaceScope | null;
  accounts: WorkspaceAccount[];
  activeAccount: WorkspaceAccount | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  canManageAccounts: boolean;
  switchAccount: (accountId: string) => Promise<void>;
  createAccount: (name: string, contentLanguage: ContentLanguage) => Promise<string>;
  reload: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bootstrap, setBootstrap] = useState<WorkspaceBootstrapResult | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setBootstrap(null);
      setLoading(false);
      return;
    }

    const email = resolveUserEmail(user);
    if (!email) {
      setBootstrap(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await bootstrapWorkspaceAccounts(
        user.uid,
        email,
        user.displayName ?? undefined,
      );
      setBootstrap(result);
    } catch {
      const isPlatformAdmin = isPlatformAdminEmail(email);
      setActiveWorkspaceScope({ ownerId: user.uid, accountId: DEFAULT_ACCOUNT_ID });
      setBootstrap({
        scope: { ownerId: user.uid, accountId: DEFAULT_ACCOUNT_ID },
        accounts: [],
        isPlatformAdmin,
        canManageAccounts: isPlatformAdmin,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activeAccount = useMemo(() => {
    if (!bootstrap?.scope) return null;
    return (
      bootstrap.accounts.find((a) => a.id === bootstrap.scope.accountId) ??
      bootstrap.accounts[0] ??
      null
    );
  }, [bootstrap]);

  const switchAccount = useCallback(
    async (accountId: string) => {
      if (!user) return;
      const scope = await switchWorkspaceAccount(user.uid, accountId);
      setBootstrap((prev) =>
        prev
          ? {
              ...prev,
              scope,
              accounts: prev.accounts,
            }
          : prev,
      );
      notifyOnboardingProgressChanged();
    },
    [user],
  );

  const createAccount = useCallback(
    async (name: string, contentLanguage: ContentLanguage) => {
      if (!user) throw new Error("Not signed in");
      const id = await createWorkspaceAccount(user.uid, { name, contentLanguage });
      const accounts = bootstrap?.accounts ?? [];
      const created: WorkspaceAccount = {
        id,
        name: name.trim(),
        contentLanguage,
        setupStep: "author",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setBootstrap((prev) =>
        prev
          ? {
              ...prev,
              accounts: [created, ...accounts],
            }
          : prev,
      );
      await switchAccount(id);
      return id;
    },
    [user, bootstrap?.accounts, switchAccount],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      scope: bootstrap?.scope ?? null,
      accounts: bootstrap?.accounts ?? [],
      activeAccount,
      loading,
      isPlatformAdmin: bootstrap?.isPlatformAdmin ?? false,
      canManageAccounts: bootstrap?.canManageAccounts ?? false,
      switchAccount,
      createAccount,
      reload,
    }),
    [bootstrap, activeAccount, loading, switchAccount, createAccount, reload],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
