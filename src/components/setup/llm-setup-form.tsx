"use client";

import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { useFormatUserError } from "@/hooks/use-format-user-error";
import type { UserErrorInfo } from "@/lib/errors/format-user-error";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import {
  defaultModelForProvider,
  getUserLlmProfile,
  saveUserLlmProfile,
} from "@/lib/workspace/llm-settings";
import { ensureUserDoc, updateSetupStep } from "@/lib/workspace/user";
import type { LlmProvider } from "@/types/workspace";
import { INPUT_CLASS, LABEL_CLASS } from "@/types/workspace";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

const PROVIDERS: LlmProvider[] = ["openai", "perplexity", "anthropic", "google"];

function useProviderGuides(t: ReturnType<typeof useTranslations<"setup.llm">>) {
  return {
    openai: {
      name: t("providers.openai.name"),
      steps: t.raw("providers.openai.steps") as string[],
      link: t("providers.openai.link"),
      linkLabel: t("providers.openai.linkLabel"),
      keyPlaceholder: t("providers.openai.keyPlaceholder"),
    },
    perplexity: {
      name: t("providers.perplexity.name"),
      steps: t.raw("providers.perplexity.steps") as string[],
      link: t("providers.perplexity.link"),
      linkLabel: t("providers.perplexity.linkLabel"),
      keyPlaceholder: t("providers.perplexity.keyPlaceholder"),
    },
    anthropic: {
      name: t("providers.anthropic.name"),
      steps: t.raw("providers.anthropic.steps") as string[],
      link: t("providers.anthropic.link"),
      linkLabel: t("providers.anthropic.linkLabel"),
      keyPlaceholder: t("providers.anthropic.keyPlaceholder"),
    },
    google: {
      name: t("providers.google.name"),
      steps: t.raw("providers.google.steps") as string[],
      link: t("providers.google.link"),
      linkLabel: t("providers.google.linkLabel"),
      keyPlaceholder: t("providers.google.keyPlaceholder"),
    },
  } satisfies Record<LlmProvider, {
    name: string;
    steps: string[];
    link: string;
    linkLabel: string;
    keyPlaceholder: string;
  }>;
}

export function LlmSetupForm() {
  const t = useTranslations("setup.llm");
  const formatError = useFormatUserError();
  const guides = useProviderGuides(t);
  const { user } = useAuth();
  const router = useRouter();
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [errorInfo, setErrorInfo] = useState<UserErrorInfo | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      const profile = await getUserLlmProfile(user.uid);
      if (profile) {
        setProvider(profile.provider);
        setApiKey(profile.apiKey);
      }
      setLoaded(true);
    })();
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
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
      await updateSetupStep(user.uid, "author");
      notifyOnboardingProgressChanged();
      router.push("/setup/author");
    } catch {
      setErrorInfo({ message: t("errors.saveFailed") });
    } finally {
      setPending(false);
    }
  }

  if (!loaded) return <p className="text-sm text-ns-secondary">…</p>;

  return (
    <div className="space-y-8">
      <OnboardingStepBanner stepKey="llm" />
      <div>
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ns-secondary">{t("subtitle")}</p>
        <p className="mt-2 text-xs text-amber-800">{t("privacyNote")}</p>
      </div>

      <OnboardingStepper placement="settings" />

      <form onSubmit={onSubmit} className="max-w-xl space-y-6">
        <div>
          <label className={LABEL_CLASS} htmlFor="provider">
            {t("provider")}
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as LlmProvider)}
            className={INPUT_CLASS}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {guides[p].name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-gray-100 bg-ns-brand-light p-4">
          <h3 className="text-sm font-semibold text-ns-tertiary">
            {guides[provider].name} — {t("howToGetKey")}
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
          <label className={LABEL_CLASS} htmlFor="api-key">
            {t("apiKey")}
          </label>
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

        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-ns-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
        >
          {t("continue")}
        </button>
      </form>
    </div>
  );
}
