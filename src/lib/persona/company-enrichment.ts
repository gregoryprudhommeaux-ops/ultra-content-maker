import {
  migrateLinkedInActivitySources,
  migrateWebSources,
} from "@/lib/profile/author-reference-urls";
import type { AuthorSteeringPayload } from "@/lib/profile/author-steering-context";
import type {
  AuthorProfile,
  ContentArchetype,
  CompanyOffer,
  GapAnswerValue,
} from "@/types/workspace";

export const COMPANY_ENRICHMENT_KEYS = {
  companyName: "company_name",
  productOrOfferName: "product_or_offer_name",
  categoryThesis: "category_thesis",
  productProofPoints: "product_proof_points",
  companyOffers: "company_offers",
} as const;

export const MAX_COMPANY_OFFERS = 3;

export function showsCompanyProfileFields(archetype: ContentArchetype | undefined): boolean {
  return archetype === "founder_product" || archetype === "hybrid";
}

export function emptyCompanyOffer(): CompanyOffer {
  return { name: "", categoryThesis: "", differentiators: "" };
}

function readString(details: Record<string, GapAnswerValue>, key: string): string {
  const v = details[key];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ").trim();
  return "";
}

export function parseCompanyOffersFromEnrichment(
  details: Record<string, GapAnswerValue> | null | undefined,
): CompanyOffer[] {
  if (!details) return [];

  const rawJson = readString(details, COMPANY_ENRICHMENT_KEYS.companyOffers);
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      if (Array.isArray(parsed)) {
        const offers = parsed
          .map((item): CompanyOffer | null => {
            if (!item || typeof item !== "object") return null;
            const o = item as Record<string, unknown>;
            const name = typeof o.name === "string" ? o.name.trim() : "";
            if (!name) return null;
            return {
              name,
              categoryThesis:
                typeof o.categoryThesis === "string" ? o.categoryThesis.trim() : "",
              differentiators:
                typeof o.differentiators === "string" ? o.differentiators.trim() : "",
            };
          })
          .filter((o): o is CompanyOffer => o !== null)
          .slice(0, MAX_COMPANY_OFFERS);
        if (offers.length > 0) return offers;
      }
    } catch {
      /* fall through to legacy keys */
    }
  }

  const legacyName = readString(details, COMPANY_ENRICHMENT_KEYS.productOrOfferName);
  const legacyThesis = readString(details, COMPANY_ENRICHMENT_KEYS.categoryThesis);
  const legacyProof = readString(details, COMPANY_ENRICHMENT_KEYS.productProofPoints);
  if (!legacyName && !legacyThesis && !legacyProof) return [];

  return [
    {
      name: legacyName,
      categoryThesis: legacyThesis,
      differentiators: legacyProof,
    },
  ];
}

export function companyOffersToEnrichmentPatch(
  offers: CompanyOffer[],
): Record<string, GapAnswerValue> {
  const trimmed = offers
    .map((o) => ({
      name: o.name.trim(),
      categoryThesis: o.categoryThesis?.trim() ?? "",
      differentiators: o.differentiators?.trim() ?? "",
    }))
    .filter((o) => o.name.length > 0)
    .slice(0, MAX_COMPANY_OFFERS);

  const primary = trimmed[0];
  return {
    [COMPANY_ENRICHMENT_KEYS.companyOffers]: JSON.stringify(trimmed),
    [COMPANY_ENRICHMENT_KEYS.productOrOfferName]: primary?.name ?? "",
    [COMPANY_ENRICHMENT_KEYS.categoryThesis]: primary?.categoryThesis ?? "",
    [COMPANY_ENRICHMENT_KEYS.productProofPoints]: primary?.differentiators ?? "",
  };
}

export function buildCompanyContextForPrompt(
  details: Record<string, GapAnswerValue> | null | undefined,
): string | null {
  const offers = parseCompanyOffersFromEnrichment(details);
  if (offers.length === 0) return null;

  const lines = offers.map((o, i) => {
    const parts = [`Offer ${i + 1}: ${o.name}`];
    if (o.categoryThesis) parts.push(`Category / ICP problem: ${o.categoryThesis}`);
    if (o.differentiators) parts.push(`Differentiators / proof: ${o.differentiators}`);
    return parts.join(" · ");
  });

  return `Company / product context (use when postAngle is product or company expertise · company name MUST appear in generated posts):\n${lines.join("\n")}`;
}

export function offerNamesFromEnrichment(
  details: Record<string, GapAnswerValue> | null | undefined,
): string[] {
  return parseCompanyOffersFromEnrichment(details).map((o) => o.name).filter(Boolean);
}

const ROLE_TITLE_COMPANY_RE =
  /\b(?:chez|at|@|de la société|de l['’]entreprise|for|pour)\s+([A-ZÀ-ÖØ-Þ0-9][^|,·\n]{1,80})/i;

function titleCaseFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function companyNameFromLinkedInUrl(url: string): string | undefined {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/company\/([^/?#]+)/i);
    if (!match?.[1]) return undefined;
    const slug = decodeURIComponent(match[1]).trim();
    if (!slug || slug.length < 2) return undefined;
    return titleCaseFromSlug(slug);
  } catch {
    return undefined;
  }
}

function companyNameFromRoleTitle(roleTitle: string): string | undefined {
  const trimmed = roleTitle.trim();
  if (!trimmed) return undefined;

  const match = ROLE_TITLE_COMPANY_RE.exec(trimmed);
  if (match?.[1]) {
    return match[1].replace(/\s+(?:CEO|PDG|founder|fondateur).*$/i, "").trim();
  }

  const separatorMatch = trimmed.match(/\s[|·]\s([^|·]+)$/);
  if (separatorMatch?.[1]) {
    const candidate = separatorMatch[1].trim();
    if (candidate.length >= 2 && candidate.length <= 80) return candidate;
  }

  return undefined;
}

/** Best-effort company name for company/product post angles (Persona fallback when empty). */
export function resolveCompanyNameForPrompt(input: {
  author?: Pick<
    AuthorProfile,
    | "roleTitle"
    | "positioningLine"
    | "linkedinActivitySources"
    | "webSources"
    | "linkedinActivityUrl"
  > | null;
  profileEnrichment?: Record<string, GapAnswerValue> | null;
  authorSteering?: AuthorSteeringPayload | null;
}): string | undefined {
  const author = input.author ?? input.authorSteering?.author ?? null;
  const enrichment =
    input.profileEnrichment ?? input.authorSteering?.profileEnrichment ?? null;

  const fromEnrichment = readString(
    (enrichment ?? {}) as Record<string, GapAnswerValue>,
    COMPANY_ENRICHMENT_KEYS.companyName,
  );
  if (fromEnrichment) return fromEnrichment;

  for (const source of migrateLinkedInActivitySources(author)) {
    if (source.kind !== "linkedin_company") continue;
    if (source.label?.trim()) return source.label.trim();
    const fromUrl = companyNameFromLinkedInUrl(source.url);
    if (fromUrl) return fromUrl;
  }

  for (const source of migrateWebSources(author)) {
    if (source.kind === "website" && source.label?.trim()) {
      return source.label.trim();
    }
  }

  const fromRole = companyNameFromRoleTitle(author?.roleTitle ?? "");
  if (fromRole) return fromRole;

  return undefined;
}

export function buildPostBriefPromptContext(input: {
  author?: Pick<
    AuthorProfile,
    | "roleTitle"
    | "positioningLine"
    | "linkedinActivitySources"
    | "webSources"
    | "linkedinActivityUrl"
  > | null;
  profileEnrichment?: Record<string, GapAnswerValue> | Record<string, unknown> | null;
  authorSteering?: AuthorSteeringPayload | null;
}): { companyName?: string } {
  const enrichment = (input.profileEnrichment ??
    input.authorSteering?.profileEnrichment ??
    null) as Record<string, GapAnswerValue> | null;

  const companyName = resolveCompanyNameForPrompt({
    author: input.author ?? input.authorSteering?.author ?? null,
    profileEnrichment: enrichment,
    authorSteering: input.authorSteering,
  });
  const offers = offerNamesFromEnrichment(enrichment);
  return {
    ...(companyName ? { companyName } : {}),
    ...(offers[0] ? { defaultProductFocus: offers[0] } : {}),
  };
}
