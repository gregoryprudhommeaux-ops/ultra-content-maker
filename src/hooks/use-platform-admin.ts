"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import {
  hasPlatformAdminClaim,
  isPlatformAdminIdentity,
} from "@/lib/workspace/platform-admin";
import { resolveUserEmail } from "@/lib/workspace/resolve-user-email";
import { useEffect, useState } from "react";

/** Admin from Firebase custom claim (primary), uid/email allowlist, or workspace bootstrap. */
export function usePlatformAdmin(): boolean {
  const { user } = useAuth();
  const { isPlatformAdmin: fromWorkspace } = useWorkspace();
  const [fromClaim, setFromClaim] = useState(false);

  useEffect(() => {
    if (!user) {
      setFromClaim(false);
      return;
    }

    let cancelled = false;

    void user.getIdTokenResult(true).then((result) => {
      if (cancelled) return;
      const claimAdmin = hasPlatformAdminClaim(result.claims as Record<string, unknown>);
      const allowlistAdmin = isPlatformAdminIdentity({
        uid: user.uid,
        email: resolveUserEmail(user),
      });
      setFromClaim(claimAdmin || allowlistAdmin);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return false;

  return (
    fromClaim ||
    isPlatformAdminIdentity({
      uid: user.uid,
      email: resolveUserEmail(user),
    }) ||
    fromWorkspace
  );
}
