import type { ContentArchetype, CompanyOffer, GapAnswerValue } from "@/types/workspace";

export const COMPANY_ENRICHMENT_KEYS = {
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

  return `Company / product context (use when postAngle is product or archetype is founder_product/hybrid):\n${lines.join("\n")}`;
}

export function offerNamesFromEnrichment(
  details: Record<string, GapAnswerValue> | null | undefined,
): string[] {
  return parseCompanyOffersFromEnrichment(details).map((o) => o.name).filter(Boolean);
}
