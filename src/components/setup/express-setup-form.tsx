"use client";

import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { useAuth } from "@/components/auth/auth-provider";
import { OptionalLabel } from "@/components/setup/optional-label";
import {
  DashboardPageHero,
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { GeneratingIndicator } from "@/components/ui/generating-indicator";
import type { UserErrorInfo } from "@/lib/errors/format-user-error";
import { getClientAuth } from "@/lib/firebase/client";
import { isInvalidApiKeyError } from "@/lib/llm/provider-errors";
import { skipAudienceStep } from "@/lib/workspace/audience";
import {
  getAuthorProfile,
  saveAuthorProfile,
} from "@/lib/workspace/author";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import { listSources } from "@/lib/workspace/sources";
import { getProfileEnrichment } from "@/lib/workspace/enrichment";
import { getAudienceProfile } from "@/lib/workspace/audience";
import { savePersonaDraft } from "@/lib/workspace/persona";
import { serializeForApi } from "@/lib/workspace/serialize-profile";
import { updateSetupStep } from "@/lib/workspace/user";
import { BTN_PRIMARY, BTN_SECONDARY, CARD_SOFT } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import type { ContentLanguage } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type PrefillState = {
  roleTitle?: string;
  positioningLine?: string;
  verticalLabel?: string;
  influenceAngle?: string;
  fromLinkedIn: boolean;
  failed?: boolean;
};

export function ExpressSetupForm() {
  const t = useTranslations("setup.express");
  const tPersona = useTranslations("setup.persona");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const router = useRouter();

  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState("");
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(
    locale === "fr" || locale === "es" ? locale : "en",
  );
  const [roleTitle, setRoleTitle] = useState("");
  const [positioningLine, setPositioningLine] = useState("");
  const [prefill, setPrefill] = useState<PrefillState | null>(null);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [phase, setPhase] = useState<"idle" | "persona">("idle");
  const [errorInfo, setErrorInfo] = useState<UserErrorInfo | null>(null);
  const prefillRequestRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const profile = await getAuthorProfile(user.uid);
      if (profile?.linkedinProfileUrl) setLinkedinProfileUrl(profile.linkedinProfileUrl);
      if (profile?.contentLanguage) setContentLanguage(profile.contentLanguage);
      if (profile?.roleTitle) setRoleTitle(profile.roleTitle);
      if (profile?.positioningLine) setPositioningLine(profile.positioningLine);
      setLoading(false);
    })();
  }, [user]);

  const runPrefill = useCallback(async () => {
    const url = linkedinProfileUrl.trim();
    setErrorInfo(null);

    if (!user) return;
    if (!url || !isValidUrl(url)) {
      setErrorInfo({ message: t("errors.invalidLinkedIn") });
      return;
    }
    if (!/linkedin\.com\/in\//i.test(url)) {
      setErrorInfo({ message: t("errors.notProfileUrl") });
      return;
    }

    const requestId = ++prefillRequestRef.current;
    setPrefillLoading(true);
    setPrefill(null);
    try {
      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) return;

      const res = await fetch("/api/linkedin/profile-prefill", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkedinProfileUrl: url,
          contentLanguage,
        }),
      });
      const data = (await res.json()) as {
        prefill?: {
          accessible?: boolean;
          roleTitle?: string;
          positioningLine?: string;
          detectedLanguage?: ContentLanguage;
          verticalLabel?: string;
          influenceAngle?: string;
        };
        error?: string;
      };
      if (requestId !== prefillRequestRef.current) return;

      if (!res.ok) {
        setPrefill({ fromLinkedIn: false, failed: true });
        const err = data.error;
        if (err === "invalid_api_key" || err === "no_llm_key") {
          setErrorInfo({ message: t("errors.llmNotConfigured") });
        } else if (err === "subscription_expired") {
          setErrorInfo({ message: t("errors.subscriptionExpired") });
        } else {
          setErrorInfo({ message: t("prefillFailed") });
        }
        return;
      }

      const hasContent =
        Boolean(data.prefill?.roleTitle?.trim()) ||
        Boolean(data.prefill?.positioningLine?.trim());

      if (data.prefill?.accessible === false && !hasContent) {
        setPrefill({ fromLinkedIn: false, failed: true });
        setErrorInfo({ message: t("profileNotAccessible") });
        return;
      }

      if (!hasContent || !data.prefill) {
        setPrefill({ fromLinkedIn: false, failed: true });
        setErrorInfo({ message: t("prefillFailed") });
        return;
      }

      const prefillData = data.prefill;
      const nextRole = prefillData.roleTitle?.trim() ?? "";
      const nextPositioning = prefillData.positioningLine?.trim() ?? "";
      if (nextRole) setRoleTitle(nextRole);
      if (nextPositioning) setPositioningLine(nextPositioning);
      if (
        prefillData.detectedLanguage === "fr" ||
        prefillData.detectedLanguage === "es" ||
        prefillData.detectedLanguage === "en"
      ) {
        setContentLanguage(prefillData.detectedLanguage);
      }
      setPrefill({
        fromLinkedIn: true,
        roleTitle: nextRole,
        positioningLine: nextPositioning,
        verticalLabel: prefillData.verticalLabel?.trim(),
        influenceAngle: prefillData.influenceAngle?.trim(),
      });
    } catch {
      if (requestId === prefillRequestRef.current) {
        setPrefill({ fromLinkedIn: false, failed: true });
        setErrorInfo({ message: t("prefillFailed") });
      }
    } finally {
      if (requestId === prefillRequestRef.current) {
        setPrefillLoading(false);
      }
    }
  }, [user, linkedinProfileUrl, contentLanguage, t]);

  const showSuggestedFields =
    prefill !== null || Boolean(roleTitle || positioningLine);

  async function onSubmit() {
    if (!user) return;
    setErrorInfo(null);

    const linkedin = linkedinProfileUrl.trim();
    if (!linkedin || !isValidUrl(linkedin)) {
      setErrorInfo({ message: t("errors.invalidLinkedIn") });
      return;
    }
    if (!/linkedin\.com\/in\//i.test(linkedin)) {
      setErrorInfo({ message: t("errors.notProfileUrl") });
      return;
    }

    setPending(true);
    setPhase("persona");
    try {
      await saveAuthorProfile(user.uid, {
        linkedinProfileUrl: linkedin,
        contentLanguage,
        roleTitle: roleTitle.trim() || undefined,
        positioningLine: positioningLine.trim() || undefined,
        status: "in_progress",
      });
      await skipAudienceStep(user.uid);
      await updateSetupStep(user.uid, "persona");
      notifyOnboardingProgressChanged();

      const auth = getClientAuth();
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("no_token");

      const [author, audience, sources, enrichment] = await Promise.all([
        getAuthorProfile(user.uid),
        getAudienceProfile(user.uid),
        listSources(user.uid),
        getProfileEnrichment(user.uid),
      ]);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000);
      let res: Response;
      try {
        res = await fetch("/api/persona/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            author: serializeForApi(author),
            audience: serializeForApi(audience),
            sources: serializeForApi(sources),
            contentLanguage,
            profileEnrichment: enrichment?.details ?? {},
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "";
        if (data.error === "no_llm_key") {
          setErrorInfo({ message: tPersona("noLlmKey") });
        } else if (isInvalidApiKeyError(detail)) {
          setErrorInfo({ message: tPersona("invalidApiKey") });
        } else {
          setErrorInfo({
            message: t("errors.personaFailed"),
          });
        }
        router.push("/persona");
        return;
      }

      await savePersonaDraft(
        user.uid,
        data.promptText,
        data.model,
        data.gapQuestions ?? [],
        contentLanguage,
      );
      notifyOnboardingProgressChanged();
      router.push("/start/ready");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setErrorInfo({ message: tPersona("generateTimeout") });
      } else {
        setErrorInfo({ message: t("errors.saveFailed") });
      }
      router.push("/persona");
    } finally {
      setPending(false);
      setPhase("idle");
    }
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  if (pending && phase === "persona") {
    return (
      <DashboardPageShell>
        <GeneratingIndicator
          label={t("generatingPersona")}
          hint={t("generatingPersonaHint")}
          className="max-w-xl"
        />
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <OnboardingStepBanner stepKey="express" />
      <DashboardPageHero title={t("title")} subtitle={t("subtitle")} />

      <DashboardPageSection>
        <div className={`${CARD_SOFT} space-y-5`}>
          <p className="rounded-lg border border-ns-primary/20 bg-ns-primary/5 px-3 py-2.5 text-sm leading-relaxed text-ns-secondary">
            {t("trustNote")}
          </p>

          <div>
            <OptionalLabel htmlFor="express-linkedin" optional={false}>
              {t("linkedin")}
            </OptionalLabel>
            <p className="mb-2 text-sm text-ns-secondary">{t("linkedinHint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <ImeSafeInput
                id="express-linkedin"
                value={linkedinProfileUrl}
                onValueChange={(v) => {
                  setLinkedinProfileUrl(v);
                  setErrorInfo(null);
                }}
                placeholder="https://www.linkedin.com/in/..."
                className={`${INPUT_CLASS} min-w-0 flex-1`}
              />
              <button
                type="button"
                disabled={prefillLoading || pending}
                onClick={() => void runPrefill()}
                className={`${BTN_SECONDARY} shrink-0 whitespace-nowrap disabled:opacity-50`}
              >
                {prefillLoading ? t("scanProfileLoading") : t("scanProfile")}
              </button>
            </div>
            {prefillLoading && (
              <p className="mt-1.5 text-xs font-medium text-ns-primary">{t("prefillLoading")}</p>
            )}
            {prefill?.fromLinkedIn && !prefillLoading && (
              <div className="mt-1.5 space-y-1">
                <p className="text-xs font-medium text-emerald-800">{t("prefillSuccess")}</p>
                {(prefill.verticalLabel || prefill.influenceAngle) && (
                  <p className="text-xs leading-relaxed text-ns-secondary">
                    {prefill.verticalLabel && (
                      <span className="font-medium text-ns-tertiary">{prefill.verticalLabel}</span>
                    )}
                    {prefill.verticalLabel && prefill.influenceAngle ? " · " : null}
                    {prefill.influenceAngle}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <OptionalLabel htmlFor="express-lang" optional={false}>
              {t("contentLanguage")}
            </OptionalLabel>
            <p className="mb-2 text-sm text-ns-secondary">{t("contentLanguageHint")}</p>
            <select
              id="express-lang"
              value={contentLanguage}
              onChange={(e) => setContentLanguage(e.target.value as ContentLanguage)}
              className={INPUT_CLASS}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
            </select>
          </div>

          {showSuggestedFields ? (
            <div className="space-y-4 rounded-xl border border-gray-100 bg-ns-brand-light/30 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ns-secondary">
                  {t("suggestedSection")}
                </p>
                {!prefill?.fromLinkedIn && !roleTitle && !positioningLine && (
                  <p className="mt-1 text-xs text-ns-secondary">{t("scanProfileHint")}</p>
                )}
              </div>
              <div>
                <OptionalLabel htmlFor="express-role">{t("role")}</OptionalLabel>
                <ImeSafeInput
                  id="express-role"
                  value={roleTitle}
                  onValueChange={setRoleTitle}
                  placeholder={t("rolePlaceholder")}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <OptionalLabel htmlFor="express-positioning">{t("positioning")}</OptionalLabel>
                <ImeSafeTextarea
                  id="express-positioning"
                  rows={5}
                  value={positioningLine}
                  onValueChange={setPositioningLine}
                  placeholder={t("positioningPlaceholder")}
                  className={`${INPUT_CLASS} min-h-[7rem] resize-y`}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-ns-secondary">{t("scanProfileHint")}</p>
          )}

          <div className="rounded-xl border border-dashed border-ns-alternate bg-white/80 px-4 py-3 text-sm leading-relaxed text-ns-secondary">
            {t("fullProfileLater")}{" "}
            <Link href="/setup/author?from=express" className="font-medium text-ns-tertiary underline">
              {t("fullProfileLink")}
            </Link>
          </div>

          {errorInfo && <p className="text-sm text-red-600">{errorInfo.message}</p>}

          <button
            type="button"
            disabled={pending}
            onClick={() => void onSubmit()}
            className={`${BTN_PRIMARY} disabled:opacity-50`}
          >
            {t("continue")}
          </button>
        </div>
      </DashboardPageSection>
    </DashboardPageShell>
  );
}
