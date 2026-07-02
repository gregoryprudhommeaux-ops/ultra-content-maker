"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { tierForbiddenUserApiKey } from "@/lib/subscription/constants";
import { useWorkspace } from "@/contexts/workspace-context";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { listSignInProviderIds } from "@/lib/auth/sign-in-methods";
import { resolveUserEmail } from "@/lib/workspace/resolve-user-email";
import { getUserDoc } from "@/lib/workspace/user";
import { CARD_SOFT } from "@/lib/ui/nextstep";
import {
  formatAccountApiKeyDisplay,
  tierAlwaysMasksApiKey,
} from "@/lib/llm/mask-api-key";
import { LLM_PROVIDERS } from "@/lib/llm/provider-guides";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import type { SubscriptionAccess } from "@/types/subscription";
import type { LlmProvider, UserDoc } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type AccountStatusKey = "admin" | "free" | "pro" | "proPlus" | "supportTotal" | "expired";

const ACCOUNT_STATUS_I18N: Record<AccountStatusKey, string> = {
 admin: "statusAdmin",
 free: "statusFree",
 pro: "statusPro",
 proPlus: "statusProPlus",
 supportTotal: "statusSupportTotal",
 expired: "statusExpired",
};

function resolveAccountStatusKey(
  isPlatformAdmin: boolean,
  access: SubscriptionAccess | null,
): AccountStatusKey | null {
  if (isPlatformAdmin) return "admin";
  if (!access) return null;
  if (access.isExpired || access.effectiveTier === "expired") return "expired";
  const tier = access.effectiveTier;
  if (tier === "free_test" || access.isTrialActive) return "free";
  if (tier === "pro") return "pro";
  if (tier === "pro_plus" || tier === "free_without_api") return "proPlus";
  if (tier === "full_free") return "proPlus";
  if (tier === "support_starter" || tier === "support_regular" || tier === "support_total") {
    return "supportTotal";
  }
  return null;
}

function AccountInfoRow({
 label,
 children,
}: {
 label: string;
 children: ReactNode;
}) {
 return (
 <div className="flex flex-col gap-0.5 border-b border-gray-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
 <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ns-secondary sm:w-40">
 {label}
 </dt>
 <dd className="min-w-0 flex-1 text-sm font-medium text-ns-tertiary">{children}</dd>
 </div>
 );
}

type Props = {
  onChangeApiKey?: () => void;
};

export function UserAccountInfoPanel({ onChangeApiKey }: Props) {
 const t = useTranslations("setup.llm.account");
 const tLlm = useTranslations("setup.llm");
 const locale = useLocale();
 const { user } = useAuth();
 const { activeAccount } = useWorkspace();
 const { access, loading: subscriptionLoading } = useSubscription();
 const platformOnlyTier = Boolean(access && tierForbiddenUserApiKey(access.effectiveTier));
 const isPlatformAdmin = usePlatformAdmin();
 const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
 const [llmProvider, setLlmProvider] = useState<LlmProvider | null>(null);
 const [hasUserKey, setHasUserKey] = useState(false);
 const [loaded, setLoaded] = useState(false);

 useEffect(() => {
 if (!user) return;
 void Promise.all([getUserDoc(user.uid), getUserLlmProfile(user.uid)]).then(
 ([doc, llmProfile]) => {
 setUserDoc(doc);
 const provider =
 llmProfile?.provider && LLM_PROVIDERS.includes(llmProfile.provider)
 ? llmProfile.provider
 : null;
 setLlmProvider(provider);
 setHasUserKey(
 !platformOnlyTier && Boolean(llmProfile?.userProvided && llmProfile.apiKey?.trim()),
 );
 setLoaded(true);
 },
 );
 }, [user, access?.effectiveTier]);

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

 const accountStatusKey = useMemo(
 () => resolveAccountStatusKey(isPlatformAdmin, access),
 [isPlatformAdmin, access, platformOnlyTier],
 );

 const providerLabel = useMemo(() => {
 if (!llmProvider) return null;
 return tLlm(`providers.${llmProvider}.name`);
 }, [llmProvider, tLlm]);

 const apiKeyDisplay = useMemo(() => {
 const usesPlatformLlm = Boolean(access?.canUsePlatformLlm && !access.canUseOwnLlmOnly);
 return formatAccountApiKeyDisplay({
 provider: llmProvider,
 hasUserKey,
 usesPlatformLlm,
 providerLabel,
 labels: {
 platform: t("apiKeyPlatform"),
 notConfigured: t("apiKeyNotConfigured"),
 masked: t("apiKeyMasked"),
 },
 });
 }, [access, hasUserKey, llmProvider, providerLabel, t]);

 const showChangeKeyButton = useMemo(() => {
 if (subscriptionLoading) return false;
 if (platformOnlyTier) return false;
 if (access?.isExpired) return false;
 if (isPlatformAdmin) return true;
 if (!access) return true;
 return tierAlwaysMasksApiKey(access) || access.canUseOwnLlmOnly || access.canUsePlatformLlm;
 }, [access, isPlatformAdmin, subscriptionLoading]);

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
 <span className="break-all">{email ?? "-"}</span>
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

 <AccountInfoRow label={t("accountStatus")}>
 {subscriptionLoading ? (
 <span className="text-ns-secondary">…</span>
 ) : accountStatusKey ? (
 <span
 className={
 accountStatusKey === "expired"
 ? "text-xs font-medium text-amber-700"
 : "text-xs font-medium text-ns-primary"
 }
 >
 {t(ACCOUNT_STATUS_I18N[accountStatusKey])}
 </span>
 ) : (
 <span className="text-ns-secondary">-</span>
 )}
 </AccountInfoRow>

 <AccountInfoRow label={t("apiKey")}>
 {subscriptionLoading ? (
 <span className="text-ns-secondary">…</span>
 ) : (
 <div className="flex flex-wrap items-center gap-2">
 <span className="font-mono text-sm tracking-wide text-ns-tertiary">
 {apiKeyDisplay}
 </span>
 {showChangeKeyButton ? (
 <button
 type="button"
 onClick={onChangeApiKey}
 className="shrink-0 rounded-lg border border-ns-alternate px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ns-secondary transition hover:bg-gray-50"
 >
 {t("changeApiKey")}
 </button>
 ) : null}
 </div>
 )}
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
