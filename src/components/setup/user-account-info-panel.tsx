"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { listSignInProviderIds } from "@/lib/auth/sign-in-methods";
import { resolveUserEmail } from "@/lib/workspace/resolve-user-email";
import { getUserDoc } from "@/lib/workspace/user";
import { CARD_SOFT } from "@/lib/ui/nextstep";
import type { UserDoc } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

function AccountInfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ns-secondary sm:w-40">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium text-ns-tertiary">{children}</dd>
    </div>
  );
}

export function UserAccountInfoPanel() {
  const t = useTranslations("setup.llm.account");
  const locale = useLocale();
  const { user } = useAuth();
  const { activeAccount } = useWorkspace();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    void getUserDoc(user.uid).then((doc) => {
      setUserDoc(doc);
      setLoaded(true);
    });
  }, [user]);

  const email = resolveUserEmail(user);
  const displayName =
    user?.displayName?.trim() ||
    userDoc?.displayName?.trim() ||
    null;

  const signInLabels = useMemo(() => {
    if (!user) return [];
    return listSignInProviderIds(user).map((providerId) => {
      if (providerId === "google.com") return t("signInGoogle");
      if (providerId === "password") return t("signInEmail");
      return providerId;
    });
  }, [user, t]);

  const memberSince = useMemo(() => {
    const date = userDoc?.createdAt;
    if (!date) return null;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
    }).format(date);
  }, [userDoc?.createdAt, locale]);

  if (!user) return null;

  if (!loaded) {
    return (
      <section className={CARD_SOFT}>
        <p className="text-sm text-ns-secondary">…</p>
      </section>
    );
  }

  return (
    <section className={CARD_SOFT}>
      <header className="mb-1">
        <h2 className="text-base font-semibold text-ns-tertiary">{t("title")}</h2>
        <p className="mt-1 text-sm text-ns-secondary">{t("subtitle")}</p>
      </header>

      <dl>
        <AccountInfoRow label={t("name")}>
          {displayName ?? <span className="text-ns-secondary">{t("nameFallback")}</span>}
        </AccountInfoRow>

        <AccountInfoRow label={t("email")}>
          <span className="break-all">{email ?? "—"}</span>
          {user.emailVerified ? (
            <span className="mt-1 block text-xs font-medium text-ns-primary">
              {t("emailVerified")}
            </span>
          ) : email ? (
            <span className="mt-1 block text-xs font-medium text-amber-700">
              {t("emailNotVerified")}
            </span>
          ) : null}
        </AccountInfoRow>

        <AccountInfoRow label={t("signIn")}>
          {signInLabels.length > 0 ? signInLabels.join(" · ") : t("signInUnknown")}
        </AccountInfoRow>

        {activeAccount?.name ? (
          <AccountInfoRow label={t("activeWorkspace")}>
            {activeAccount.name}
          </AccountInfoRow>
        ) : null}

        {memberSince ? (
          <AccountInfoRow label={t("memberSince")}>{memberSince}</AccountInfoRow>
        ) : null}

        <AccountInfoRow label={t("userId")}>
          <code className="break-all font-mono text-xs text-ns-secondary">{user.uid}</code>
        </AccountInfoRow>
      </dl>
    </section>
  );
}
