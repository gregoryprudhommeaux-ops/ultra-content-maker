"use client";

import { useAuth } from "@/components/auth/auth-provider";
import {
  getClient,
  updateClientContentLanguage,
  updateClientOnboardingStatus,
} from "@/lib/clients/firestore";
import { loadAllOnboardingSteps, saveOnboardingStep } from "@/lib/onboarding/firestore";
import { Link, useRouter } from "@/i18n/navigation";
import type { Client } from "@/types/client";
import {
  ONBOARDING_STEP_COUNT,
  type OnboardingStep1,
  type OnboardingStep2,
  type OnboardingStep3,
  type OnboardingStep4,
  type OnboardingStep5,
  type OnboardingStepNumber,
} from "@/types/onboarding";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-ns-alternate bg-white px-3 py-2 text-sm text-ns-tertiary placeholder:text-ns-secondary/60 outline-none focus:border-ns-primary";
const labelClass = "mb-1 block text-sm font-medium text-ns-tertiary";

type Props = { clientId: string };

export function OnboardingWizard({ clientId }: Props) {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [step, setStep] = useState<OnboardingStepNumber>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s1, setS1] = useState<OnboardingStep1>({
    role: "",
    offer: "",
    positioningOneLiner: "",
  });
  const [s2, setS2] = useState<OnboardingStep2>({
    icp: "",
    pains: "",
    objections: "",
    proof: "",
  });
  const [s3, setS3] = useState<OnboardingStep3>({
    tone: "",
    wordsToAvoid: "",
    largeNicheRatio: "50/50",
    ctaStyle: "",
    psRule: "",
  });
  const [s4, setS4] = useState<OnboardingStep4>({ contentLanguage: "en" });
  const [s5, setS5] = useState<OnboardingStep5>({
    linkedinUrl: "",
    websiteUrl: "",
    bio: "",
    postExamples: "",
    googleDocUrl: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const c = await getClient(user.uid, clientId);
      if (!c) {
        setError(t("errors.clientNotFound"));
        return;
      }
      setClient(c);
      setS4({ contentLanguage: c.contentLanguage });

      const steps = await loadAllOnboardingSteps(user.uid, clientId);
      if (steps[1]) setS1(steps[1] as OnboardingStep1);
      if (steps[2]) setS2(steps[2] as OnboardingStep2);
      if (steps[3]) setS3(steps[3] as OnboardingStep3);
      if (steps[4]) setS4(steps[4] as OnboardingStep4);
      if (steps[5]) setS5(steps[5] as OnboardingStep5);

      const firstIncomplete = ([1, 2, 3, 4, 5] as OnboardingStepNumber[]).find(
        (n) => !steps[n],
      );
      if (firstIncomplete) setStep(firstIncomplete);
    } catch {
      setError(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, clientId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function persistCurrentStep(): Promise<boolean> {
    if (!user) return false;
    setSaving(true);
    setError(null);
    try {
      const payloads: Record<OnboardingStepNumber, unknown> = {
        1: s1,
        2: s2,
        3: s3,
        4: s4,
        5: s5,
      };
      await saveOnboardingStep(
        user.uid,
        clientId,
        step,
        payloads[step] as Parameters<typeof saveOnboardingStep>[3],
      );

      if (step === 1 && client?.onboardingStatus === "not_started") {
        await updateClientOnboardingStatus(user.uid, clientId, "in_progress");
        setClient((c) => (c ? { ...c, onboardingStatus: "in_progress" } : c));
      }

      if (step === 4) {
        await updateClientContentLanguage(user.uid, clientId, s4.contentLanguage);
      }

      return true;
    } catch {
      setError(t("errors.saveFailed"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onNext() {
    const ok = await persistCurrentStep();
    if (!ok) return;
    if (step < ONBOARDING_STEP_COUNT) {
      setStep((step + 1) as OnboardingStepNumber);
    }
  }

  async function onFinish() {
    const ok = await persistCurrentStep();
    if (!ok || !user) return;
    try {
      await updateClientOnboardingStatus(user.uid, clientId, "completed");
      router.push(`/clients/${clientId}`);
    } catch {
      setError(t("errors.saveFailed"));
    }
  }

  async function onBack() {
    if (step > 1) setStep((step - 1) as OnboardingStepNumber);
  }

  if (loading) {
    return <p className="text-sm text-ns-secondary">{tCommon("loading")}</p>;
  }

  if (!client) {
    return (
      <p className="text-sm text-red-600">{error ?? t("errors.clientNotFound")}</p>
    );
  }

  const stepTitles: Record<OnboardingStepNumber, string> = {
    1: t("steps.1.title"),
    2: t("steps.2.title"),
    3: t("steps.3.title"),
    4: t("steps.4.title"),
    5: t("steps.5.title"),
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/clients/${clientId}`}
          className="text-sm text-ns-secondary hover:text-ns-tertiary"
        >
          ← {client.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-1 text-sm text-ns-secondary">
          {t("progress", { current: step, total: ONBOARDING_STEP_COUNT })} —{" "}
          {stepTitles[step]}
        </p>
        <div className="mt-4 flex gap-1">
          {Array.from({ length: ONBOARDING_STEP_COUNT }, (_, i) => {
            const n = (i + 1) as OnboardingStepNumber;
            return (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  n <= step ? "bg-ns-primary" : "bg-ns-alternate"
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-ns-surface p-6">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-ns-secondary">
              {t("steps.1.hint", { type: client.clientTypeLabel })}
            </p>
            <div>
              <label className={labelClass}>{t("steps.1.role")}</label>
              <input
                className={inputClass}
                value={s1.role}
                onChange={(e) => setS1({ ...s1, role: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t("steps.1.offer")}</label>
              <textarea
                className={inputClass}
                rows={2}
                value={s1.offer}
                onChange={(e) => setS1({ ...s1, offer: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>{t("steps.1.positioning")}</label>
              <input
                className={inputClass}
                value={s1.positioningOneLiner}
                onChange={(e) =>
                  setS1({ ...s1, positioningOneLiner: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{t("steps.2.icp")}</label>
              <textarea className={inputClass} rows={2} value={s2.icp} onChange={(e) => setS2({ ...s2, icp: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.2.pains")}</label>
              <textarea className={inputClass} rows={2} value={s2.pains} onChange={(e) => setS2({ ...s2, pains: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.2.objections")}</label>
              <textarea className={inputClass} rows={2} value={s2.objections} onChange={(e) => setS2({ ...s2, objections: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.2.proof")}</label>
              <textarea className={inputClass} rows={2} value={s2.proof} onChange={(e) => setS2({ ...s2, proof: e.target.value })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>{t("steps.3.tone")}</label>
              <textarea className={inputClass} rows={2} value={s3.tone} onChange={(e) => setS3({ ...s3, tone: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.3.wordsToAvoid")}</label>
              <input className={inputClass} value={s3.wordsToAvoid} onChange={(e) => setS3({ ...s3, wordsToAvoid: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.3.largeNiche")}</label>
              <input className={inputClass} value={s3.largeNicheRatio} onChange={(e) => setS3({ ...s3, largeNicheRatio: e.target.value })} placeholder="e.g. 60% Large / 40% Niche" />
            </div>
            <div>
              <label className={labelClass}>{t("steps.3.cta")}</label>
              <input className={inputClass} value={s3.ctaStyle} onChange={(e) => setS3({ ...s3, ctaStyle: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.3.ps")}</label>
              <input className={inputClass} value={s3.psRule} onChange={(e) => setS3({ ...s3, psRule: e.target.value })} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-ns-secondary">{t("steps.4.description")}</p>
            <div>
              <label className={labelClass}>{t("steps.4.language")}</label>
              <select
                className={inputClass}
                value={s4.contentLanguage}
                onChange={(e) =>
                  setS4({
                    ...s4,
                    contentLanguage: e.target.value as OnboardingStep4["contentLanguage"],
                  })
                }
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-ns-secondary">{t("steps.5.description")}</p>
            <div>
              <label className={labelClass}>{t("steps.5.linkedin")}</label>
              <input className={inputClass} type="url" value={s5.linkedinUrl} onChange={(e) => setS5({ ...s5, linkedinUrl: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.5.website")}</label>
              <input className={inputClass} type="url" value={s5.websiteUrl} onChange={(e) => setS5({ ...s5, websiteUrl: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.5.bio")}</label>
              <textarea className={inputClass} rows={3} value={s5.bio} onChange={(e) => setS5({ ...s5, bio: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.5.posts")}</label>
              <textarea className={inputClass} rows={4} value={s5.postExamples} onChange={(e) => setS5({ ...s5, postExamples: e.target.value })} placeholder={t("steps.5.postsPlaceholder")} />
            </div>
            <div>
              <label className={labelClass}>{t("steps.5.googleDoc")}</label>
              <input className={inputClass} type="url" value={s5.googleDocUrl} onChange={(e) => setS5({ ...s5, googleDocUrl: e.target.value })} />
            </div>
            <p className="text-xs text-ns-secondary/60">{t("steps.5.pdfNote")}</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={step === 1 || saving}
            className="rounded-lg border border-ns-alternate px-4 py-2 text-sm font-medium text-ns-tertiary disabled:opacity-40"
          >
            {t("back")}
          </button>
          {step < ONBOARDING_STEP_COUNT ? (
            <button
              type="button"
              onClick={onNext}
              disabled={saving}
              className="rounded-sm bg-ns-primary px-5 py-2 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
            >
              {saving ? tCommon("loading") : t("next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              disabled={saving}
              className="rounded-sm bg-ns-primary px-5 py-2 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
            >
              {saving ? tCommon("loading") : t("finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
