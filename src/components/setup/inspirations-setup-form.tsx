"use client";

import { InspirationsEditor } from "@/components/setup/inspirations-editor";
import { useAuth } from "@/components/auth/auth-provider";
import { resolveInspirationsReturn } from "@/lib/navigation/inspirations-return";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function InspirationsSetupForm() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const t = useTranslations("setup.inspirations");
  const returnTarget = resolveInspirationsReturn(searchParams.get("from"));

  if (!user) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  return (
    <InspirationsEditor
      userId={user.uid}
      showMyPosts
      showPersonaHint
      returnHref={returnTarget.href}
      returnLabel={t(returnTarget.labelKey)}
    />
  );
}
