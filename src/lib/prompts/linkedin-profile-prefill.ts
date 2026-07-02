import type { ContentLanguage } from "@/types/workspace";
import type { LinkedInPublicProfile } from "@/lib/linkedin/fetch-public-profile";

export type LinkedInProfilePrefillSource = Omit<LinkedInPublicProfile, "contextText">;

export type LinkedInProfilePrefillLlmResult = {
  accessible?: boolean;
  roleTitle?: string;
  positioningLine?: string;
  detectedLanguage?: ContentLanguage;
  verticalLabel?: string;
  influenceAngle?: string;
};

const LANGUAGE_NAMES: Record<ContentLanguage, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
};

export function buildLinkedInProfilePrefillSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const outputLang = LANGUAGE_NAMES[contentLanguage];

  return `You are a senior LinkedIn influence strategist and critical profile analyst.
Read the LinkedIn profile at the given URL. Extract the HEADLINE and the ABOUT section.

Return JSON only:
{
  "accessible": true,
  "roleTitle": "max 100 chars — LinkedIn HEADLINE (professional title + value prop), NOT the About first line",
  "positioningLine": "max 750 chars — rewrite the ABOUT section in first person: who they are, expertise, who they help, proof, angle",
  "detectedLanguage": "en" | "fr" | "es",
  "verticalLabel": "short vertical label",
  "influenceAngle": "one sentence influence hook"
}

Rules:
- roleTitle = HEADLINE under the person's name (e.g. "Helping SMEs grow across Mexico & LatAm | …"), NOT a tagline from About.
- positioningLine = ABOUT section only — never recommendation quotes, never third-party testimonials.
- Write in ${outputLang}. Facts traceable to profile only.`;
}

export function buildLinkedInProfilePrefillUserPrompt(
  profileUrl: string,
  contentLanguage: ContentLanguage,
): string {
  return `LinkedIn profile URL:
${profileUrl.trim()}

Target language: ${LANGUAGE_NAMES[contentLanguage]} (${contentLanguage}).

Read HEADLINE and ABOUT. Return roleTitle (headline), positioningLine (about rewrite), detectedLanguage, verticalLabel, influenceAngle.`;
}

export function buildLinkedInProfileSynthesisSystemPrompt(
  contentLanguage: ContentLanguage,
): string {
  const outputLang = LANGUAGE_NAMES[contentLanguage];
  return `You write onboarding prefill for a ghostwriter AI from LinkedIn profile data.

Return JSON only:
{
  "accessible": true,
  "roleTitle": "max 100 chars — LinkedIn HEADLINE",
  "positioningLine": "max 750 chars — ABOUT-style bio, first person",
  "detectedLanguage": "en" | "fr" | "es",
  "verticalLabel": "short vertical",
  "influenceAngle": "one sentence"
}

STRICT rules:
- roleTitle = headline field if present; else synthesize from role + company + vertical (NOT About opening line).
- positioningLine = professional self-description like the About section.
- NEVER include recommendation quotes ("I had the chance to work with…", third-person praise).
- NEVER include organization membership blurbs ("The ultimate French business community…").
- Use: about text, volunteering role descriptions, services, company, location — woven as a coherent first-person bio.
- Write in ${outputLang}.`;
}

export function buildLinkedInProfileSynthesisUserPrompt(
  profileUrl: string,
  contextText: string,
  contentLanguage: ContentLanguage,
): string {
  return `LinkedIn: ${profileUrl.trim()}
Output language: ${LANGUAGE_NAMES[contentLanguage]}

Profile data (ignore recommendation lines if any):
---
${contextText}
---

Produce roleTitle from headline, positioningLine from About-style content.`;
}

/** Detect third-party recommendation text — not usable as author bio. */
export function isRecommendationText(text: string): boolean {
  const t = text.trim();
  return (
    /^["'“]/.test(t) ||
    /^i had the chance to work with/i.test(t) ||
    /^i've known/i.test(t) ||
    /\b(worked with .+ for \d+ years)\b/i.test(t) ||
    /\b(i sincerely hope|highly recommend|trustful person)\b/i.test(t)
  );
}

function isOrgMembershipBlurb(text: string): boolean {
  return (
    /ultimate .+ community with qualified/i.test(text) ||
    /^http:\/\/www\./i.test(text.trim()) ||
    /members\.?\s*$/i.test(text)
  );
}

function cleanAboutText(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  let text = raw
    .trim()
    .replace(/\s*Based in….*$/i, "")
    .replace(/\s*Based in\.\.\..*$/i, "")
    .replace(/\s*…\s*$/g, "")
    .trim();
  if (isRecommendationText(text) || isOrgMembershipBlurb(text)) return undefined;
  return text.length > 15 ? text : undefined;
}

function expandTruncatedAbout(
  profile: LinkedInProfilePrefillSource,
  aboutSeed: string,
  lang: ContentLanguage,
): string {
  const parts: string[] = [aboutSeed];
  const loc = profile.location?.trim();
  const company = profile.currentCompany?.trim();

  if (loc && !aboutSeed.toLowerCase().includes(loc.toLowerCase().slice(0, 8))) {
    parts.push(
      lang === "fr"
        ? `Basé à ${loc}.`
        : lang === "es"
          ? `Con base en ${loc}.`
          : `Based in ${loc}.`,
    );
  }

  const vol = profile.volunteering?.find((v) => v.description && v.description.length > 40);
  if (vol?.description && !aboutSeed.includes(vol.description.slice(0, 30))) {
    parts.push(vol.description.trim());
  }

  if (company && !aboutSeed.toLowerCase().includes(company.toLowerCase().slice(0, 6))) {
    const line =
      lang === "fr"
        ? `Fondateur / dirigeant chez ${company}.`
        : lang === "es"
          ? `Fundador en ${company}.`
          : `Founder at ${company}.`;
    parts.push(line);
  }

  if (profile.services?.length) {
    const label = lang === "fr" ? "Expertise" : lang === "es" ? "Especialidades" : "Expertise";
    parts.push(`${label} : ${profile.services.slice(0, 6).join(" · ")}.`);
  }

  return parts.join("\n\n");
}

function buildPersonaBio(
  profile: LinkedInProfilePrefillSource,
  contentLanguage: ContentLanguage,
): string | undefined {
  const aboutRaw = cleanAboutText(profile.about ?? profile.description);
  if (aboutRaw && aboutRaw.length >= 120 && !profile.aboutTruncated) {
    return aboutRaw.slice(0, 750);
  }

  if (aboutRaw) {
    const expanded = expandTruncatedAbout(profile, aboutRaw, contentLanguage);
    if (expanded.length >= 40) return expanded.slice(0, 750);
  }

  const vol = profile.volunteering?.find((v) => v.description && v.description.length > 50);
  if (vol) {
    const parts = [
      vol.description!.trim(),
      profile.services?.length
        ? `${contentLanguage === "fr" ? "Expertise" : "Expertise"} : ${profile.services.slice(0, 5).join(" · ")}.`
        : undefined,
    ].filter(Boolean);
    return parts.join("\n\n").slice(0, 750);
  }

  if (profile.services?.length && profile.currentCompany) {
    const intro =
      contentLanguage === "fr"
        ? `Professionnel chez ${profile.currentCompany}.`
        : `Professional at ${profile.currentCompany}.`;
    return `${intro}\n\nExpertise : ${profile.services.slice(0, 6).join(" · ")}.`.slice(0, 750);
  }

  return aboutRaw?.slice(0, 750);
}

export function buildBasicPrefillFromPublicProfile(
  profile: LinkedInProfilePrefillSource,
  contentLanguage: ContentLanguage,
): LinkedInProfilePrefillLlmResult {
  const roleTitle = pickInferredRoleTitle(profile);
  const positioningLine = buildPersonaBio(profile, contentLanguage);

  return normalizeLinkedInProfilePrefill({
    accessible: true,
    roleTitle: roleTitle || undefined,
    positioningLine: positioningLine || undefined,
    detectedLanguage: contentLanguage,
    verticalLabel: profile.currentCompany?.slice(0, 80),
    influenceAngle: profile.headline
      ? `Headline LinkedIn détecté`
      : undefined,
  });
}

function pickInferredRoleTitle(profile: LinkedInProfilePrefillSource): string {
  const company = profile.currentCompany?.trim();
  const headline = profile.headline?.trim();

  if (headline && headline.includes("|")) {
    const lead = headline.split("|")[0]?.trim();
    if (lead && lead.length >= 12) return lead.slice(0, 100);
  }

  if (headline && headline.length > 15) {
    if (!company || headline.toLowerCase() !== company.toLowerCase()) {
      return headline.slice(0, 100);
    }
  }

  const vol = profile.volunteering?.[0];
  if (vol?.title) {
    const org = vol.subtitle?.trim();
    const combined = org && org !== vol.title ? `${vol.title} · ${org}` : vol.title;
    if (combined.length > 8) return combined.slice(0, 100);
  }

  if (company && (profile.services?.length ?? 0) > 0) {
    return `${profile.services![0]} · ${company}`.slice(0, 100);
  }

  if ((profile.services?.length ?? 0) >= 2) {
    return profile.services!.slice(0, 3).join(" · ").slice(0, 100);
  }

  if (company) return company.slice(0, 100);
  return profile.name?.slice(0, 100) ?? "";
}

export function isPersonaUsefulBio(text: string | undefined): boolean {
  if (!text || text.trim().length < 50) return false;
  if (isRecommendationText(text)) return false;
  if (isOrgMembershipBlurb(text.split("\n")[0] ?? "")) return false;
  return true;
}

export function normalizeLinkedInProfilePrefill(
  raw: LinkedInProfilePrefillLlmResult,
): LinkedInProfilePrefillLlmResult {
  const accessible = raw.accessible !== false;
  if (!accessible) return { accessible: false };

  let positioningLine = raw.positioningLine?.trim();
  if (positioningLine && !isPersonaUsefulBio(positioningLine)) {
    positioningLine = undefined;
  }

  const roleTitle = raw.roleTitle?.trim().slice(0, 100);
  const lang = raw.detectedLanguage;
  const detectedLanguage =
    lang === "fr" || lang === "es" || lang === "en" ? lang : undefined;

  return {
    accessible: true,
    roleTitle: roleTitle || undefined,
    positioningLine: positioningLine?.slice(0, 750),
    detectedLanguage,
    verticalLabel: raw.verticalLabel?.trim().slice(0, 80) || undefined,
    influenceAngle: raw.influenceAngle?.trim().slice(0, 200) || undefined,
  };
}
