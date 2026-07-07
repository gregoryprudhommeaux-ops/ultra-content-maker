import type { AuthorProfile, ContentArchetype } from "@/types/workspace";

const ARCHETYPES: ContentArchetype[] = ["expert", "founder_product", "hybrid"];

export function normalizeContentArchetype(raw: unknown): ContentArchetype {
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "founder_product" || v === "founder-product" || v === "founder") {
      return "founder_product";
    }
    if (v === "hybrid" || v === "mix" || v === "mixed") return "hybrid";
    if (v === "expert" || v === "consultant" || v === "thought_leader") {
      return "expert";
    }
  }
  return "expert";
}

export function isContentArchetype(raw: unknown): raw is ContentArchetype {
  return typeof raw === "string" && ARCHETYPES.includes(raw as ContentArchetype);
}

/** Resolve editorial archetype: explicit profile > enrichment gap > role/positioning heuristic. */
export function resolveContentArchetype(input: {
  author?: Pick<AuthorProfile, "contentArchetype" | "roleTitle" | "positioningLine"> | null;
  profileEnrichment?: Record<string, unknown> | null;
}): ContentArchetype {
  if (input.author?.contentArchetype) {
    return normalizeContentArchetype(input.author.contentArchetype);
  }
  const fromEnrichment = input.profileEnrichment?.content_archetype;
  if (fromEnrichment != null && String(fromEnrichment).trim()) {
    return normalizeContentArchetype(fromEnrichment);
  }
  return inferContentArchetypeFromText(
    `${input.author?.roleTitle ?? ""} ${input.author?.positioningLine ?? ""}`,
  );
}

function inferContentArchetypeFromText(text: string): ContentArchetype {
  const t = text.toLowerCase();
  if (!t.trim()) return "expert";

  const founderSignals =
    /\b(ceo|fondateur|founder|co-founder|cofounder|pdg|directeur général|directrice générale|chief executive|startup|saas|produit|product)\b/.test(
      t,
    );
  const expertSignals =
    /\b(consultant|conseil|conseiller|coach|expert|advisor|consulting|cabinet|freelance|indépendant)\b/.test(
      t,
    );

  if (founderSignals && expertSignals) return "hybrid";
  if (founderSignals) return "founder_product";
  return "expert";
}

export function buildPersonaArchetypeInstruction(
  archetype: ContentArchetype,
  languageName: string,
): string {
  const base = `Content archetype for this author: ${archetype}. Adapt the entire expert prompt (Topic DNA, proof policy, hooks, anti-patterns) to this archetype. All section headings stay in ${languageName}.`;

  if (archetype === "founder_product") {
    return `${base}

Founder / product CEO rules (encode in promptText):
- Lead with the ICP problem and category POV · product is proof, not the opening pitch.
- Topic DNA pillars: category education, customer outcomes, build/why-we-built story, product-in-the-wild (use cases), founder lessons · avoid generic leadership fluff.
- Beliefs: market/category thesis the company defends · how the product changes workflow for the ICP.
- Proof policy: real customer results, product metrics, demos-as-story, team/build notes · never invent clients or numbers.
- Product mention policy: name the product when it clarifies the lesson (roughly 1 in 3 posts may reference it explicitly) · no feature laundry lists, no "book a demo" in post body.
- Still people-first LinkedIn: insight before inventory · no hard sell, no external links in body.`;
  }

  if (archetype === "hybrid") {
    return `${base}

Hybrid (expert + product company) rules:
- Balance thought leadership with category/product proof · alternate expert POV posts and product-grounded stories.
- Topic DNA: mix expertise pillars AND product/category pillars · state the intended mix (e.g. 60% category/expertise, 40% product proof).
- Product mention policy: explicit but restrained · product appears as case for the thesis, not as ad copy.`;
  }

  return `${base}

Expert / consultant rules (default):
- People-first expert voice: how we think > what we sell.
- Topic DNA pillars: expertise, methodology, field observations, client patterns (anonymized) · avoid product brochure tone unless author sells a product in positioning.`;
}

export function buildLinkedInArchetypeRules(archetype: ContentArchetype): string {
  if (archetype === "founder_product") {
    return `- Founder-product voice: problem-first and category-led · show how the product proves the thesis (customer outcome, before/after, build story) · not a brochure.
- Name the product when it sharpens the lesson · skip feature dumps and "book a demo" in hook/body/ps.
- Mix post types: category insight, customer win (with permission tone), why we built X, honest lesson from shipping.`;
  }
  if (archetype === "hybrid") {
    return `- Hybrid voice: expert POV AND product/category proof · vary posts between pure insight and product-grounded stories.
- When the post references the offer/product, tie it to a concrete ICP problem · never read like an ad script.`;
  }
  return `- People-first expert voice: show how the author thinks, not generic corporate speak.`;
}
