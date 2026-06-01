"use client";

import {
  AuthorProfileTabs,
  parseAuthorTab,
  type AuthorProfileTab,
} from "@/components/setup/author-profile-tabs";
import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { InspirationsEditor } from "@/components/setup/inspirations-editor";
import { MyPostsLinksEditor } from "@/components/setup/my-posts-links-editor";
import { useAuth } from "@/components/auth/auth-provider";
import { validateLinkedInActivityUrl } from "@/lib/linkedin/activity-url";
import { resolveInspirationsReturn } from "@/lib/navigation/inspirations-return";
import { completeAuthorStep, getAuthorProfile, isAuthorProfileMinimumComplete, saveAuthorProfile } from "@/lib/workspace/author";
import { ensureUserDoc, updateSetupStep } from "@/lib/workspace/user";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { ContentLanguage } from "@/types/workspace";
import { OptionalLabel } from "@/components/setup/optional-label";
import {
  DashboardPageHero,
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { BTN_PRIMARY, DASHBOARD_FORM } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export function AuthorSetupForm() {
  const t = useTranslations("setup.author");
  const tSteps = useTranslations("setup.steps");
  const tCommon = useTranslations("common");
  const tInspirations = useTranslations("setup.inspirations");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseAuthorTab(searchParams.get("tab"));
  const fromParam = searchParams.get("from");
  const returnTarget = useMemo(
    () => (fromParam ? resolveInspirationsReturn(fromParam) : null),
    [fromParam],
  );
  const tabQuerySuffix = fromParam ? `from=${encodeURIComponent(fromParam)}` : "";

  const [linkedinProfileUrl, setLinkedinProfileUrl] = useState("");
  const [linkedinActivityUrl, setLinkedinActivityUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [blogUrl, setBlogUrl] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [positioningLine, setPositioningLine] = useState("");
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(locale);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      const profile = await getAuthorProfile(user.uid);
      if (profile) {
        setLinkedinProfileUrl(profile.linkedinProfileUrl ?? "");
        setLinkedinActivityUrl(profile.linkedinActivityUrl ?? "");
        setWebsiteUrl(profile.websiteUrl ?? "");
        setBlogUrl(profile.blogUrl ?? "");
        setRoleTitle(profile.roleTitle ?? "");
        setPositioningLine(profile.positioningLine ?? "");
        setContentLanguage(profile.contentLanguage);
      }
      setLoaded(true);
    })();
  }, [user]);

  async function persist(markComplete: boolean) {
    if (!user) return false;
    const urls = [linkedinProfileUrl, websiteUrl, blogUrl]
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    for (const u of urls) {
      if (!isValidUrl(u.trim())) {
        setError(t("invalidUrl"));
        return false;
      }
    }
    const activityCheck = validateLinkedInActivityUrl(linkedinActivityUrl);
    if (activityCheck === "invalid") {
      setError(t("invalidUrl"));
      return false;
    }
    if (activityCheck === "not_activity") {
      setError(t("linkedinActivityNotActivity"));
      return false;
    }

    const draft = {
      linkedinProfileUrl: linkedinProfileUrl.trim() || undefined,
      linkedinActivityUrl: linkedinActivityUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      blogUrl: blogUrl.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      positioningLine: positioningLine.trim() || undefined,
      contentLanguage,
    };

    if (markComplete && !isAuthorProfileMinimumComplete(draft)) {
      const missingTab = resolveMissingAuthorTab(draft);
      if (missingTab !== activeTab) {
        navigateToTab(missingTab);
      }
      setError(t("errors.requiredFields"));
      return false;
    }

    await saveAuthorProfile(user.uid, {
      ...draft,
      status: markComplete ? "complete" : "in_progress",
    });
    if (markComplete) await completeAuthorStep(user.uid);
    return true;
  }

  function navigateToTab(tab: AuthorProfileTab) {
    const params = new URLSearchParams({ tab });
    if (fromParam) params.set("from", fromParam);
    router.push(`/setup/author?${params.toString()}`);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const ok = await persist(false);
      if (ok) {
        setError(null);
        notifyOnboardingProgressChanged();
      }
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  async function onContinue(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const ok = await persist(true);
      if (!ok) return;
      await updateSetupStep(user.uid, "audience");
      notifyOnboardingProgressChanged();
      router.push("/setup/audience");
    } catch {
      setError(t("saveFailed"));
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-ns-secondary">…</p>;
  }

  return (
    <DashboardPageShell>
      <OnboardingStepBanner stepKey="author" />
      <DashboardPageHero
        eyebrow={tSteps("author")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <DashboardPageSection className="space-y-6">
        <AuthorProfileTabs active={activeTab} querySuffix={tabQuerySuffix} />

        <p className="text-xs font-medium text-ns-secondary">
          {tCommon("required")} · {tCommon("optional")}
        </p>

        <p className="text-sm font-medium text-ns-secondary">{t(`tabs.hint.${activeTab}`)}</p>

        <form onSubmit={onContinue} className={DASHBOARD_FORM}>
        {activeTab === "essential" && (
          <EssentialFields
            t={t}
            linkedinProfileUrl={linkedinProfileUrl}
            setLinkedinProfileUrl={setLinkedinProfileUrl}
            linkedinActivityUrl={linkedinActivityUrl}
            setLinkedinActivityUrl={setLinkedinActivityUrl}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            blogUrl={blogUrl}
            setBlogUrl={setBlogUrl}
          />
        )}

        {activeTab === "voice" && user && (
          <VoiceFields
            t={t}
            userId={user.uid}
            roleTitle={roleTitle}
            setRoleTitle={setRoleTitle}
            positioningLine={positioningLine}
            setPositioningLine={setPositioningLine}
            contentLanguage={contentLanguage}
            setContentLanguage={setContentLanguage}
          />
        )}

        {activeTab === "inspirations" && user && (
          <InspirationsEditor
            userId={user.uid}
            showMyPosts={false}
            showPersonaHint={false}
            hidePageHeader
            returnHref={returnTarget?.href}
            returnLabel={returnTarget ? tInspirations(returnTarget.labelKey) : undefined}
          />
        )}

        <p className="text-xs text-ns-secondary">{t(`tabs.requiredNote.${activeTab}`)}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onSave}
            className="rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
          >
            {t("save")}
          </button>
          <button type="submit" disabled={pending} className={`${BTN_PRIMARY} disabled:opacity-50`}>
            {t("continue")}
          </button>
        </div>
        </form>
      </DashboardPageSection>
    </DashboardPageShell>
  );
}

function EssentialFields({
  t,
  linkedinProfileUrl,
  setLinkedinProfileUrl,
  linkedinActivityUrl,
  setLinkedinActivityUrl,
  websiteUrl,
  setWebsiteUrl,
  blogUrl,
  setBlogUrl,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  linkedinProfileUrl: string;
  setLinkedinProfileUrl: (v: string) => void;
  linkedinActivityUrl: string;
  setLinkedinActivityUrl: (v: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (v: string) => void;
  blogUrl: string;
  setBlogUrl: (v: string) => void;
}) {
  return (
    <>
      <div>
        <OptionalLabel htmlFor="linkedin" optional={false}>
          {t("linkedin")}
        </OptionalLabel>
        <input
          id="linkedin"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={linkedinProfileUrl}
          onChange={(e) => setLinkedinProfileUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/..."
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <OptionalLabel htmlFor="linkedin-activity">{t("linkedinActivity")}</OptionalLabel>
        <p className="mb-2 text-xs text-ns-secondary">{t("linkedinActivityHint")}</p>
        <input
          id="linkedin-activity"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={linkedinActivityUrl}
          onChange={(e) => setLinkedinActivityUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/.../recent-activity/all/"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <OptionalLabel htmlFor="website">{t("website")}</OptionalLabel>
        <input
          id="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <OptionalLabel htmlFor="blog">{t("blog")}</OptionalLabel>
        <input
          id="blog"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={blogUrl}
          onChange={(e) => setBlogUrl(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
    </>
  );
}

function VoiceFields({
  t,
  userId,
  roleTitle,
  setRoleTitle,
  positioningLine,
  setPositioningLine,
  contentLanguage,
  setContentLanguage,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  userId: string;
  roleTitle: string;
  setRoleTitle: (v: string) => void;
  positioningLine: string;
  setPositioningLine: (v: string) => void;
  contentLanguage: ContentLanguage;
  setContentLanguage: (v: ContentLanguage) => void;
}) {
  return (
    <>
      <div>
        <OptionalLabel htmlFor="role" optional={false}>
          {t("role")}
        </OptionalLabel>
        <input
          id="role"
          value={roleTitle}
          onChange={(e) => setRoleTitle(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <OptionalLabel htmlFor="positioning" optional={false}>
          {t("positioning")}
        </OptionalLabel>
        <input
          id="positioning"
          value={positioningLine}
          onChange={(e) => setPositioningLine(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <OptionalLabel htmlFor="lang" optional={false}>
          {t("contentLanguage")}
        </OptionalLabel>
        <select
          id="lang"
          value={contentLanguage}
          onChange={(e) => setContentLanguage(e.target.value as ContentLanguage)}
          className={INPUT_CLASS}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </select>
      </div>
      <MyPostsLinksEditor userId={userId} />
    </>
  );
}

function resolveMissingAuthorTab(
  profile: Parameters<typeof isAuthorProfileMinimumComplete>[0],
): AuthorProfileTab {
  const linkedin = profile?.linkedinProfileUrl?.trim() ?? "";
  if (!linkedin || !isValidUrl(linkedin)) return "essential";
  return "voice";
}
