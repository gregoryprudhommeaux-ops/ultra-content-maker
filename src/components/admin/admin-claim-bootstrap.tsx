"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { isUserPlatformAdmin } from "@/lib/workspace/resolve-user-email";
import { useEffect, useRef } from "react";

/** Once per session: set platformAdmin claim on server for allowlisted users (no local gcloud). */
export function AdminClaimBootstrap() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;
    if (!isUserPlatformAdmin(user)) return;
    ran.current = true;

    void (async () => {
      try {
        const auth = getClientAuth();
        const token = await auth?.currentUser?.getIdToken();
        if (!token) return;
        await fetch("/api/admin/ensure-my-claim", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch("/api/admin/workspace-accounts/purge-legacy", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* non-blocking */
      }
    })();
  }, [user]);

  return null;
}
