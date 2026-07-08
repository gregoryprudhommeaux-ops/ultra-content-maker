"use client";

import {
  AuthorProfileTabs,
  parseAuthorTab,
  type AuthorProfileTab,
} from "@/components/setup/author-profile-tabs";
import { ClientInvitePanel } from "@/components/workspace/client-invite-panel";
import { notifyOnboardingProgressChanged } from "@/contexts/onboarding-progress-context";
import { InspirationsEditor } from "@/components/setup/inspirations-editor";
import { MyPostsLinksEditor } from "@/components/setup/my-posts-links-editor";
import { AuthorBioDocumentsPanel } from "@/components/setup/author-bio-documents-panel";
import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { AuthorReferenceUrlsEditor } from "@/components/setup/author-reference-urls-editor";
import {
  legacyAuthorUrlFieldsFromSources,
  migrateLinkedInActivitySources,
  migrateWebSources,
  validateAuthorReferenceUrl,
} from "@/lib/profile/author-reference-urls";
import { resolveInspirationsReturn } from "@/lib/navigation/inspirations-return";
import { completeAuthorStep, getAuthorProfile, isAuthorProfileMinimumComplete, saveAuthorProfile } from "@/lib/workspace/author";
import {
  getResolvedAuthorProfile,
  syncAuthorProfileFromCollectedData,
} from "@/lib/profile/resolve-author-profile";
import { listSources } from "@/lib/workspace/sources";
import {
  companyOffersToEnrichmentPatch,
  parseCompanyOffersFromEnrichment,
  showsCompanyProfileFields,
} from "@/lib/persona/company-enrichment";
import { getProfileEnrichment, saveProfileEnrichment } from "@/lib/workspace/enrichment";
import {
  hasCapturedLinkedIn,
  hasExpressVoiceBasics,
  isAuthorEnrichContext,
  resolveAuthorEnrichTab,
} from "@/lib/workspace/author-enrich";
import { ensureUserDoc, updateSetupStep } from "@/lib/workspace/user";
import { isValidUrl } from "@/lib/workspace/firestore-utils";
import type { AuthorReferenceUrl, CompanyOffer, ContentArchetype, ContentLanguage } from "@/types/workspace";
import { ContentArchetypePicker } from "@/components/setup/content-archetype-picker";
import { CompanyProfileFields } from "@/components/setup/company-profile-fields";
import { OptionalLabel } from "@/components/setup/optional-label";
import {
  DashboardPageHero,
  DashboardPageSection,
  DashboardPageShell,
} from "@/components/layout/dashboard-page";
import { SaveFeedbackOverlay } from "@/components/ui/save-feedback-overlay";
import { BTN_PRIMARY, DASHBOARD_FORM } from "@/lib/ui/nextstep";
import { INPUT_CLASS } from "@/types/workspace";
import { ImeSafeInput, ImeSafeTextarea } from "@/components/ui/ime-safe-field";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

export function AuthorSetupForm() {
  const t = useTranslations("setup.author");
  const tSteps = useTranslations("setup.steps");
  const tCommon = useTranslations("common");
  const tInspirations = useTranslations("setup.inspirations");
  const locale = useLocale() as ContentLanguage;
  const { user } = useAuth();
  const { activeAccount, scope } = useWorkspace();
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
  const [linkedinActivitySources, setLinkedinActivitySources] = useState<AuthorReferenceUrl[]>([]);
  const [webSources, setWebSources] = useState<AuthorReferenceUrl[]>([]);
  const [roleTitle, setRoleTitle] = useState("");
  const [positioningLine, setPositioningLine] = useState("");
  const [contentArchetype, setContentArchetype] = useState<ContentArchetype>("expert");
  const [companyOffers, setCompanyOffers] = useState<CompanyOffer[]>([]);
  const [contentLanguage, setContentLanguage] = useState<ContentLanguage>(locale);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [savedProfile, setSavedProfile] = useState<Awaited<ReturnType<typeof getAuthorProfile>>>(null);
  const [inspirationSources, setInspirationSources] = useState<Awaited<ReturnType<typeof listSources>>>([]);
  const autoTabAppliedRef = useRef(false);

  const enrichMode = useMemo(
    () => isAuthorEnrichContext(savedProfile, fromParam),
    [savedProfile, fromParam],
  );
  const linkedinAlreadySaved = useMemo(
    () => hasCapturedLinkedIn(savedProfile, inspirationSources),
    [savedProfile, inspirationSources],
  );
  const effectiveLinkedInUrl = useMemo(
    () => linkedinProfileUrl.trim() || savedProfile?.linkedinProfileUrl?.trim() || "",
    [linkedinProfileUrl, savedProfile],
  );
  const linkedinCaptured =
    linkedinAlreadySaved || Boolean(effectiveLinkedInUrl.trim());
  const showEnrichLinkedInCaptured = enrichMode && linkedinCaptured;
  const showEssentialLinkedInCaptured =
    linkedinCaptured && activeTab === "essential";

  useEffect(() => {
    if (!user || !activeAccount) return;
    let cancelled = false;
    setLoaded(false);
    setError(null);
    (async () => {
      await ensureUserDoc(user.uid, user.email ?? "", user.displayName ?? undefined);
      await syncAuthorProfileFromCollectedData(user.uid).catch(() => {});
      const [profile, enrichment, sources] = await Promise.all([
        getResolvedAuthorProfile(user.uid),
        getProfileEnrichment(user.uid),
        listSources(user.uid).catch(() => []),
      ]);
      if (cancelled) return;
      setInspirationSources(sources);
      if (profile) {
        setSavedProfile(profile);
        setLinkedinProfileUrl(profile.linkedinProfileUrl ?? "");
        setLinkedinActivitySources(migrateLinkedInActivitySources(profile));
        setWebSources(migrateWebSources(profile));
        setRoleTitle(profile.roleTitle ?? "");
        setPositioningLine(profile.positioningLine ?? "");
        setContentArchetype(profile.contentArchetype ?? "expert");
        setContentLanguage(profile.contentLanguage);
        setCompanyOffers(parseCompanyOffersFromEnrichment(enrichment?.details));
      } else {
        setSavedProfile(null);
        setInspirationSources(sources);
        setLinkedinProfileUrl("");
        setLinkedinActivitySources([]);
        setWebSources([]);
        setRoleTitle("");
        setPositioningLine("");
        setContentArchetype("expert");
        setContentLanguage(activeAccount.contentLanguage ?? locale);
        setCompanyOffers([]);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeAccount?.id, activeAccount?.contentLanguage, scope?.ownerId, scope?.accountId, locale]);

  useEffect(() => {
    if (!loaded || autoTabAppliedRef.current) return;
    if (searchParams.get("tab")) return;
    if (!isAuthorEnrichContext(savedProfile, fromParam)) return;

    autoTabAppliedRef.current = true;
    const tab = resolveAuthorEnrichTab(savedProfile);
    const params = new URLSearchParams({ tab });
    if (fromParam) params.set("from", fromParam);
    router.replace(`/setup/author?${params.toString()}`);
  }, [loaded, savedProfile, fromParam, searchParams, router]);

  async function persist(markComplete: boolean) {
    if (!user) return false;
    const effectiveLinkedIn =
      linkedinProfileUrl.trim() || savedProfile?.linkedinProfileUrl?.trim() || "";
    const urls = [effectiveLinkedIn].filter((u) => u.length > 0);
    for (const u of urls) {
      if (!isValidUrl(u.trim())) {
        setError(t("invalidUrl"));
        return false;
      }
    }
    for (const source of linkedinActivitySources) {
      const check = validateAuthorReferenceUrl(source.kind, source.url);
      if (check === "invalid") {
        setError(t("invalidUrl"));
        return false;
      }
      if (check === "not_activity") {
        setError(t("linkedinActivityNotActivity"));
        return false;
      }
    }
    for (const source of webSources) {
      if (validateAuthorReferenceUrl(source.kind, source.url) === "invalid") {
        setError(t("invalidUrl"));
        return false;
      }
    }

    const legacyUrls = legacyAuthorUrlFieldsFromSources({
      linkedinActivitySources,
      webSources,
    });

    const draft = {
      linkedinProfileUrl: effectiveLinkedIn || undefined,
      linkedinActivitySources,
      webSources,
      linkedinActivityUrl: legacyUrls.linkedinActivityUrl,
      websiteUrl: legacyUrls.websiteUrl,
      blogUrl: legacyUrls.blogUrl,
      roleTitle: roleTitle.trim() || undefined,
      positioningLine: positioningLine.trim() || undefined,
      contentArchetype,
      contentLanguage,
    };

    if (markComplete && !enrichMode && !isAuthorProfileMinimumComplete(draft)) {
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
    const refreshed = await getAuthorProfile(user.uid);
    if (refreshed) setSavedProfile(refreshed);
    if (showsCompanyProfileFields(contentArchetype)) {
      await saveProfileEnrichment(user.uid, companyOffersToEnrichmentPatch(companyOffers));
    }
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
        setSavedFlash(true);
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
      <SaveFeedbackOverlay
        show={savedFlash}
        message={t("saveSuccess")}
        onDismiss={() => setSavedFlash(false)}
      />
      <div className="mb-6 rounded-xl border border-ns-primary/20 bg-ns-primary/5 px-4 py-3 text-sm leading-relaxed text-ns-secondary">
        <p className="font-medium text-ns-tertiary">
          {enrichMode ? t("fullProfile.enrichTitle") : t("fullProfile.anytimeTitle")}
        </p>
        <p className="mt-1">
          {enrichMode ? t("fullProfile.enrichBody") : t("fullProfile.anytimeBody")}
        </p>
      </div>
      {linkedinCaptured && (
        <ExpressCapturedSummary
          t={t}
          linkedinProfileUrl={effectiveLinkedInUrl}
          roleTitle={roleTitle}
          positioningLine={positioningLine}
          contentLanguage={contentLanguage}
        />
      )}
      <DashboardPageHero
        eyebrow={tSteps("author")}
        title={enrichMode ? t("enrichTitle") : t("title")}
        subtitle={enrichMode ? t("enrichSubtitle") : t("subtitle")}
      />

      <ClientInvitePanel />

      <DashboardPageSection className="space-y-6">
        <AuthorProfileTabs active={activeTab} querySuffix={tabQuerySuffix} />

        <p className="text-xs font-medium text-ns-secondary">
          {tCommon("required")} · {tCommon("optional")}
        </p>

        <p className="rounded-xl border border-gray-100 bg-ns-brand-light/40 px-4 py-3 text-sm leading-relaxed text-ns-secondary">
          {showEssentialLinkedInCaptured || showEnrichLinkedInCaptured
            ? t(`tabs.enrichHint.${activeTab}`)
            : t(`tabs.hint.${activeTab}`)}
        </p>

        <form onSubmit={enrichMode ? onSave : onContinue} className={DASHBOARD_FORM}>
        {activeTab === "essential" && (
          <EssentialFields
            t={t}
            enrichMode={enrichMode}
            hideLinkedInProfile={linkedinCaptured}
            linkedinProfileUrl={linkedinProfileUrl}
            setLinkedinProfileUrl={setLinkedinProfileUrl}
            linkedinActivitySources={linkedinActivitySources}
            setLinkedinActivitySources={setLinkedinActivitySources}
            webSources={webSources}
            setWebSources={setWebSources}
          />
        )}

        {activeTab === "voice" && user && (
          <VoiceFields
            t={t}
            enrichMode={enrichMode}
            userId={user.uid}
            roleTitle={roleTitle}
            setRoleTitle={setRoleTitle}
            positioningLine={positioningLine}
            setPositioningLine={setPositioningLine}
            contentArchetype={contentArchetype}
            setContentArchetype={setContentArchetype}
            companyOffers={companyOffers}
            setCompanyOffers={setCompanyOffers}
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

        <p className="rounded-lg border border-gray-100 bg-white/60 px-3 py-2 text-xs leading-relaxed text-ns-secondary">
          {showEssentialLinkedInCaptured || showEnrichLinkedInCaptured
            ? t(`tabs.enrichRequiredNote.${activeTab}`)
            : t(`tabs.requiredNote.${activeTab}`)}
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          {!enrichMode && (
            <button
              type="button"
              disabled={pending}
              onClick={onSave}
              className="rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light disabled:opacity-50"
            >
              {t("save")}
            </button>
          )}
          <button type="submit" disabled={pending} className={`${BTN_PRIMARY} disabled:opacity-50`}>
            {enrichMode ? t("enrichSave") : t("continue")}
          </button>
          {enrichMode && (
            <Link
              href="/articles/new"
              className="inline-flex items-center rounded-lg border border-ns-alternate px-4 py-2.5 text-sm font-medium text-ns-tertiary hover:bg-ns-brand-light"
            >
              {t("enrichBackToCreate")}
            </Link>
          )}
        </div>
        </form>
      </DashboardPageSection>
    </DashboardPageShell>
  );
}

function ExpressCapturedSummary({
  t,
  linkedinProfileUrl,
  roleTitle,
  positioningLine,
  contentLanguage,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  linkedinProfileUrl: string;
  roleTitle: string;
  positioningLine: string;
  contentLanguage: ContentLanguage;
}) {
  const langLabel =
    contentLanguage === "fr"
      ? "Français"
      : contentLanguage === "es"
        ? "Español"
        : "English";

  return (
    <div className="mb-6 space-y-2 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
        {t("fullProfile.capturedTitle")}
      </p>
      <ul className="space-y-1.5 text-sm text-ns-secondary">
        {linkedinProfileUrl.trim() && (
          <li className="flex gap-2">
            <span className="shrink-0 text-emerald-700">✓</span>
            <span>
              <span className="font-medium text-ns-tertiary">{t("linkedin")}:</span>{" "}
              {linkedinProfileUrl.trim()}
            </span>
          </li>
        )}
        {roleTitle.trim() && (
          <li className="flex gap-2">
            <span className="shrink-0 text-emerald-700">✓</span>
            <span>
              <span className="font-medium text-ns-tertiary">{t("role")}:</span> {roleTitle.trim()}
            </span>
          </li>
        )}
        {positioningLine.trim() && (
          <li className="flex gap-2">
            <span className="shrink-0 text-emerald-700">✓</span>
            <span className="line-clamp-2">
              <span className="font-medium text-ns-tertiary">{t("positioning")}:</span>{" "}
              {positioningLine.trim()}
            </span>
          </li>
        )}
        {contentLanguage && (
          <li className="flex gap-2">
            <span className="shrink-0 text-emerald-700">✓</span>
            <span>
              <span className="font-medium text-ns-tertiary">{t("contentLanguage")}:</span>{" "}
              {langLabel}
            </span>
          </li>
        )}
      </ul>
      <p className="text-xs leading-relaxed text-ns-secondary">{t("fullProfile.capturedHint")}</p>
    </div>
  );
}

function PrefilledFieldBlock({
  t,
  label,
  value,
  children,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  label: string;
  value: string;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const trimmed = value.trim();

  if (!trimmed || editing) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-900">{label}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ns-secondary line-clamp-3">{trimmed}</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {t("fullProfile.alreadyProvided")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-xs font-medium text-ns-tertiary underline hover:text-ns-primary"
        >
          {t("fullProfile.editField")}
        </button>
      </div>
    </div>
  );
}

function EssentialFields({
  t,
  enrichMode,
  hideLinkedInProfile,
  linkedinProfileUrl,
  setLinkedinProfileUrl,
  linkedinActivitySources,
  setLinkedinActivitySources,
  webSources,
  setWebSources,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  enrichMode: boolean;
  hideLinkedInProfile: boolean;
  linkedinProfileUrl: string;
  setLinkedinProfileUrl: (v: string) => void;
  linkedinActivitySources: AuthorReferenceUrl[];
  setLinkedinActivitySources: (v: AuthorReferenceUrl[]) => void;
  webSources: AuthorReferenceUrl[];
  setWebSources: (v: AuthorReferenceUrl[]) => void;
}) {
  const linkedinField = (
    <div>
      <OptionalLabel htmlFor="linkedin" optional={enrichMode}>
        {t("linkedin")}
      </OptionalLabel>
      <p className="mb-2 text-xs leading-relaxed text-ns-secondary">{t("linkedinHint")}</p>
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
  );

  return (
    <>
      {!hideLinkedInProfile &&
        (enrichMode ? (
          <PrefilledFieldBlock t={t} label={t("linkedin")} value={linkedinProfileUrl}>
            {linkedinField}
          </PrefilledFieldBlock>
        ) : (
          linkedinField
        ))}
      <AuthorReferenceUrlsEditor
        variant="linkedin_activity"
        items={linkedinActivitySources}
        onChange={setLinkedinActivitySources}
      />
      <AuthorReferenceUrlsEditor
        variant="web"
        items={webSources}
        onChange={setWebSources}
      />
    </>
  );
}

function VoiceFields({
  t,
  enrichMode,
  userId,
  roleTitle,
  setRoleTitle,
  positioningLine,
  setPositioningLine,
  contentArchetype,
  setContentArchetype,
  companyOffers,
  setCompanyOffers,
  contentLanguage,
  setContentLanguage,
}: {
  t: ReturnType<typeof useTranslations<"setup.author">>;
  enrichMode: boolean;
  userId: string;
  roleTitle: string;
  setRoleTitle: (v: string) => void;
  positioningLine: string;
  setPositioningLine: (v: string) => void;
  contentArchetype: ContentArchetype;
  setContentArchetype: (v: ContentArchetype) => void;
  companyOffers: CompanyOffer[];
  setCompanyOffers: (offers: CompanyOffer[]) => void;
  contentLanguage: ContentLanguage;
  setContentLanguage: (v: ContentLanguage) => void;
}) {
  const voiceBasicsDone = enrichMode && hasExpressVoiceBasics({
    roleTitle,
    positioningLine,
    contentLanguage,
  });

  const roleField = (
    <div>
      <OptionalLabel htmlFor="role" optional={enrichMode}>
        {t("role")}
      </OptionalLabel>
      <ImeSafeInput
        id="role"
        value={roleTitle}
        onValueChange={setRoleTitle}
        className={INPUT_CLASS}
      />
    </div>
  );

  const positioningField = (
    <div>
      <OptionalLabel htmlFor="positioning" optional={enrichMode}>
        {t("positioning")}
      </OptionalLabel>
      <p className="mb-2 text-sm leading-relaxed text-ns-secondary">
        {t("positioningHint")}
      </p>
      <ImeSafeTextarea
        id="positioning"
        rows={4}
        value={positioningLine}
        onValueChange={setPositioningLine}
        className={`${INPUT_CLASS} min-h-[6.5rem] resize-y`}
      />
    </div>
  );

  const archetypeField = (
    <ContentArchetypePicker
      value={contentArchetype}
      onChange={setContentArchetype}
      idPrefix="author"
    />
  );

  const companyField = (
    <CompanyProfileFields
      archetype={contentArchetype}
      offers={companyOffers}
      onChange={setCompanyOffers}
    />
  );

  const languageField = (
    <div>
      <OptionalLabel htmlFor="lang" optional={enrichMode}>
        {t("contentLanguage")}
      </OptionalLabel>
      <p className="mb-2 text-sm leading-relaxed text-ns-secondary">
        {t("contentLanguageHint")}
      </p>
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
  );

  return (
    <>
      {enrichMode ? (
        <PrefilledFieldBlock t={t} label={t("role")} value={roleTitle}>
          {roleField}
        </PrefilledFieldBlock>
      ) : (
        roleField
      )}
      {enrichMode ? (
        <PrefilledFieldBlock t={t} label={t("positioning")} value={positioningLine}>
          {positioningField}
        </PrefilledFieldBlock>
      ) : (
        positioningField
      )}
      {archetypeField}
      {companyField}
      <AuthorBioDocumentsPanel userId={userId} />
      {enrichMode ? (
        <PrefilledFieldBlock
          t={t}
          label={t("contentLanguage")}
          value={
            contentLanguage === "fr"
              ? "Français"
              : contentLanguage === "es"
                ? "Español"
                : "English"
          }
        >
          {languageField}
        </PrefilledFieldBlock>
      ) : (
        languageField
      )}
      <MyPostsLinksEditor userId={userId} />
      {voiceBasicsDone && (
        <p className="text-xs leading-relaxed text-ns-secondary">{t("fullProfile.voiceExtrasHint")}</p>
      )}
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
