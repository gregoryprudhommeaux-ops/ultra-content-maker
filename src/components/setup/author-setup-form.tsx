"use client";

import { OnboardingStepBanner } from "@/components/onboarding/onboarding-step-banner";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { InspirationsEditor } from "@/components/setup/inspirations-editor";
import { MyPostsLinksEditor } from "@/components/setup/my-posts-links-editor";
import { useAuth } from "@/components/auth/auth-provider";
import { validateLinkedInActivityUrl } from "@/lib/linkedin/activity-url";
import { completeAuthorStep, getAuthorProfile, saveAuthorProfile } from "@/lib/workspace/author";
import { ensureUserDoc, updateSetupStep } from "@/lib/workspace/user";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { ContentLanguage } from "@/types/workspace";
import { OptionalLabel } from "@/components/setup/optional-label";
import { INPUT_CLASS } from "@/types/workspace";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

export function AuthorSetupForm() {
  const t = useTranslations("setup.author");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const router = useRouter();
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
    if (!user) return;
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
    await saveAuthorProfile(user.uid, {
      linkedinProfileUrl: linkedinProfileUrl.trim() || undefined,
      linkedinActivityUrl: linkedinActivityUrl.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      blogUrl: blogUrl.trim() || undefined,
      roleTitle: roleTitle.trim() || undefined,
      positioningLine: positioningLine.trim() || undefined,
      contentLanguage,
      status: markComplete ? "complete" : "in_progress",
    });
    if (markComplete) await completeAuthorStep(user.uid);
    return true;
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
    <div className="space-y-8">
      <OnboardingStepBanner stepKey="author" />
      <div>
        <h1 className="text-2xl font-semibold text-ns-tertiary">{t("title")}</h1>
        <p className="mt-2 text-sm text-ns-secondary">{t("subtitle")}</p>
      </div>

      <form onSubmit={onContinue} className="max-w-xl space-y-6">
        <div>
          <OptionalLabel htmlFor="linkedin">{t("linkedin")}</OptionalLabel>
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
        <div>
          <OptionalLabel htmlFor="role">{t("role")}</OptionalLabel>
          <input
            id="role"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <OptionalLabel htmlFor="positioning">{t("positioning")}</OptionalLabel>
          <input
            id="positioning"
            value={positioningLine}
            onChange={(e) => setPositioningLine(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <OptionalLabel htmlFor="lang">{t("contentLanguage")}</OptionalLabel>
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

        {user && (
          <>
            <MyPostsLinksEditor userId={user.uid} />
            <InspirationsEditor
              userId={user.uid}
              showMyPosts={false}
              showPersonaHint={false}
              hidePageHeader
            />
          </>
        )}

        <p className="text-xs text-ns-secondary">{t("optionalNote")}</p>
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
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-ns-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-sm hover:bg-ns-primary/90 disabled:opacity-50"
          >
            {t("continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
