"use client";

import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { LlmTrustPanel } from "@/components/setup/llm-trust-panel";
import { ProfileDataManagement } from "@/components/setup/profile-data-management";
import { UserAccountInfoPanel } from "@/components/setup/user-account-info-panel";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { useSubscription } from "@/contexts/subscription-context";
import { tierForbiddenUserApiKey } from "@/lib/subscription/constants";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import type { UserErrorInfo } from "@/lib/errors/format-user-error";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import {
 getLlmProviderGuide,
 LLM_PROVIDERS,
} from "@/lib/llm/provider-guides";
import {
 defaultModelForProvider,
 saveUserLlmProfile,
} from "@/lib/workspace/llm-settings";
import { getClientAuth } from "@/lib/firebase/client";
import { ensureUserDoc, updateSetupStep } from "@/lib/workspace/user";
import type { LlmProvider } from "@/types/workspace";
import { OptionalLabel } from "@/components/setup/optional-label";
import {
 DashboardPageHero,
 DashboardPageSection,
 DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { BTN_PRIMARY, CARD_SOFT, DASHBOARD_FORM } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

export function LlmSetupForm() {
 const t = useTranslations("setup.llm");
 const formatError = useFormatUserError();
 const guides = Object.fromEntries(
 LLM_PROVIDERS.map((p) => [p, getLlmProviderGuide(p, t)]),
 ) as Record<LlmProvider, ReturnType<typeof getLlmProviderGuide>>;
 const { user } = useAuth();
 const { access, loading: subLoading } = useSubscription();
 const router = useRouter();
 const [provider, setProvider] = useState<LlmProvider>("openai");
 const [apiKey, setApiKey] = useState("");
 const [showKey, setShowKey] = useState(false);
 const [errorInfo, setErrorInfo] = useState<UserErrorInfo | null>(null);
 const [pending, setPending] = useState(false);
 const [loaded, setLoaded] = useState(false);
 const [showKeyForm, setShowKeyForm] = useState(false);

 useEffect(() => {
 if (!user || subLoading) return;
 (async () => {
 await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
 try {
 const auth = getClientAuth();
 const token = auth ? await auth.currentUser?.getIdToken() : null;
 if (token) {
 const res = await fetch("/api/llm/profile", {
 headers: { Authorization: `Bearer ${token}` },
 });
 if (res.ok) {
 const data = (await res.json()) as {
 provider?: LlmProvider;
 apiKey?: string;
 };
 if (data.provider && LLM_PROVIDERS.includes(data.provider)) {
 setProvider(data.provider);
 }
 setApiKey(typeof data.apiKey === "string" ? data.apiKey : "");
 }
 }
 } finally {
 setLoaded(true);
 }
 })();
 }, [user, subLoading]);

 async function onSubmit(e: FormEvent) {
 e.preventDefault();
 if (!user) return;
 if (access && tierForbiddenUserApiKey(access.effectiveTier)) {
 setErrorInfo({ message: t("platformIncluded.body") });
 return;
 }
 const trimmed = apiKey.trim();
 if (trimmed.length < 8) {
 setErrorInfo({ message: t("errors.keyTooShort") });
 return;
 }
 setErrorInfo(null);
 setPending(true);
 try {
 const verifyRes = await fetch("/api/llm/verify", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ provider, apiKey: trimmed }),
 });
 const verifyData = await verifyRes.json();
 if (!verifyRes.ok) {
 const detail = typeof verifyData.detail === "string" ? verifyData.detail : "";
 const code = typeof verifyData.error === "string" ? verifyData.error : "verify_failed";
 setErrorInfo(
 formatError({
 errorCode: code,
 detail,
 fallbackMessage: t("errors.verifyFailed", { detail: detail.slice(0, 120) }),
 }),
 );
 return;
 }

 await saveUserLlmProfile(user.uid, {
 provider,
 apiKey: trimmed,
 model: defaultModelForProvider(provider),
 });
 await updateSetupStep(user.uid, "express");
 notifyOnboardingProgressChanged();
 router.push("/setup/express");
 } catch {
 setErrorInfo({ message: t("errors.saveFailed") });
 } finally {
 setPending(false);
 }
 }

 async function onTrialContinue() {
   if (!user) return;
   setPending(true);
   try {
     await updateSetupStep(user.uid, "express");
     notifyOnboardingProgressChanged();
     router.push("/setup/express");
   } finally {
     setPending(false);
   }
 }

 if (!loaded || subLoading) return <p className="text-sm text-ns-secondary">…</p>;

 const usesPlatformLlm =
   Boolean(access?.canUsePlatformLlm && !access.canUseOwnLlmOnly);
 const platformOnlyTier = Boolean(access && tierForbiddenUserApiKey(access.effectiveTier));
 const hasUserKey = apiKey.trim().length >= 8;
 const showPlatformIncluded = platformOnlyTier || (usesPlatformLlm && !hasUserKey && !showKeyForm);
 const includedSubtitle = access?.isTrialActive
   ? t("trialIncluded.body")
   : t("platformIncluded.body");
 const includedCta = access?.isTrialActive
   ? t("trialIncluded.cta")
   : t("platformIncluded.cta");

 return (
 <DashboardPageShell>
 <OnboardingStepBanner stepKey="llm" />
 <DashboardPageHero
 title={t("title")}
 subtitle={
 showPlatformIncluded ? includedSubtitle : t("subtitle")
 }
 />

 <DashboardPageSection>
 <UserAccountInfoPanel
 onChangeApiKey={() => {
 if (platformOnlyTier) return;
 setShowKeyForm(true);
 requestAnimationFrame(() => {
 document.getElementById("llm-key-section")?.scrollIntoView({
 behavior: "smooth",
 block: "start",
 });
 document.getElementById("api-key")?.focus();
 });
 }}
 />
 </DashboardPageSection>

 {showPlatformIncluded ? (
 <DashboardPageSection>
 <div className={`${CARD_SOFT} space-y-4`}>
 <button
 type="button"
 disabled={pending}
 onClick={() => void onTrialContinue()}
 className={`${BTN_PRIMARY} disabled:opacity-50`}
 >
 {includedCta}
 </button>
 </div>
 </DashboardPageSection>
 ) : (
 <>
 <LlmTrustPanel />

 <OnboardingStepper placement="settings" />

 <DashboardPageSection>
 <form id="llm-key-section" onSubmit={onSubmit} className={DASHBOARD_FORM}>
 <div>
 <OptionalLabel htmlFor="provider" optional={false}>
 {t("provider")}
 </OptionalLabel>
 <select
 id="provider"
 value={provider}
 onChange={(e) => setProvider(e.target.value as LlmProvider)}
 className={INPUT_CLASS}
 >
 {LLM_PROVIDERS.map((p) => (
 <option key={p} value={p}>
 {guides[p].name}
 </option>
 ))}
 </select>
 </div>

 <div className={CARD_SOFT}>
 <h3 className="text-sm font-semibold text-ns-tertiary">
 {guides[provider].name} · {t("howToGetKey")}
 </h3>
 <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ns-tertiary">
 {guides[provider].steps.map((step, i) => (
 <li key={i}>{step}</li>
 ))}
 </ol>
 <a
 href={guides[provider].link}
 target="_blank"
 rel="noopener noreferrer"
 className="mt-3 inline-block text-sm font-medium text-ns-tertiary underline"
 >
 {guides[provider].linkLabel} →
 </a>
 </div>

 <div>
 <OptionalLabel htmlFor="api-key" optional={false}>
 {t("apiKey")}
 </OptionalLabel>
 <div className="flex gap-2">
 <input
 id="api-key"
 type={showKey ? "text" : "password"}
 value={apiKey}
 onChange={(e) => setApiKey(e.target.value)}
 placeholder={guides[provider].keyPlaceholder}
 className={INPUT_CLASS}
 autoComplete="off"
 />
 <button
 type="button"
 onClick={() => setShowKey((v) => !v)}
 className="shrink-0 rounded-lg border border-ns-alternate px-3 text-sm text-ns-secondary"
 >
 {showKey ? t("hideKey") : t("showKey")}
 </button>
 </div>
 <p className="mt-1 text-xs text-ns-secondary">
 {t("modelHint", { model: defaultModelForProvider(provider) })}
 </p>
 </div>

 {errorInfo && (
 <UserErrorBanner
 surface="llm-setup"
 userMessage={errorInfo.message}
 hint={errorInfo.hint}
 technical={errorInfo.technical}
 errorCode={errorInfo.errorCode}
 detail={errorInfo.detail}
 />
 )}

 <button type="submit" disabled={pending} className={`${BTN_PRIMARY} disabled:opacity-50`}>
 {t("continue")}
 </button>
 </form>
 </DashboardPageSection>
 </>
 )}

 {showPlatformIncluded && <OnboardingStepper placement="settings" />}

 <DashboardPageSection tone="muted">
 <ProfileDataManagement />
 </DashboardPageSection>
 </DashboardPageShell>
 );
}
