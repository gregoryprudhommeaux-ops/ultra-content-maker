"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { resolveLandingPath } from "@/lib/workspace/landing-path";
import { ensureUserDoc } from "@/lib/workspace/user";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

export function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      const path = await resolveLandingPath(user.uid);
      router.replace(path);
    })();
  }, [user, loading, router]);

  return <p className="text-center text-sm text-ns-secondary">…</p>;
}
