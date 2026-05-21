"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { getClientAuth } from "@/lib/firebase/client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, type ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    if (loading) return;
    if (user) return;
    // Context can lag behind Firebase right after sign-in.
    if (getClientAuth()?.currentUser) return;
    router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <p className="text-center text-sm text-ns-secondary">{t("loading")}</p>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
