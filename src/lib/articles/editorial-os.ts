import type {
  ChannelOwner,
  ContentJob,
  PostBrief,
  ProductFrame,
} from "@/types/workspace";

export const CONTENT_JOBS: ContentJob[] = ["teaser", "explain", "convert"];
export const CHANNEL_OWNERS: ChannelOwner[] = ["gregory", "la_mesa", "generic"];
export const PRODUCT_FRAMES: ProductFrame[] = [
  "la_mesa_dinners",
  "nextstep_market_entry",
  "generic",
];

export function isContentJob(v: unknown): v is ContentJob {
  return v === "teaser" || v === "explain" || v === "convert";
}

export function isChannelOwner(v: unknown): v is ChannelOwner {
  return v === "gregory" || v === "la_mesa" || v === "generic";
}

export function isProductFrame(v: unknown): v is ProductFrame {
  return (
    v === "la_mesa_dinners" ||
    v === "nextstep_market_entry" ||
    v === "generic"
  );
}

/** Tight hashtag doctrine for Gregory / LA MESA / teasers; keep 4 for generic UCM. */
export function resolveLinkedInHashtagCount(
  brief?: PostBrief | null,
): number {
  if (!brief) return 4;
  if (brief.contentJob === "teaser") return 2;
  if (brief.channelOwner === "gregory" || brief.channelOwner === "la_mesa") {
    return 2;
  }
  if (brief.productFrame === "la_mesa_dinners") return 2;
  return 4;
}

export function requiresGregoryPs(brief?: PostBrief | null): boolean {
  return brief?.channelOwner === "gregory";
}

/**
 * Prompt block injected into generation when editorial OS fields are set.
 */
export function buildEditorialOsPromptBlock(brief: PostBrief): string {
  const lines: string[] = [];

  if (brief.contentJob) {
    lines.push(`CONTENT JOB (mandatory): ${brief.contentJob.toUpperCase()}`);
    if (brief.contentJob === "teaser") {
      lines.push(
        "- TEASER rules: max ~120–150 words; ≤1 product sentence; CTA = DM or link only; ban funnel dump waitlist→profile→invite→seat; ban comment/add bait; ban follower-proof; ban network moral closes; ban WIP soft (perfeccionando / lo que realmente me interesa).",
      );
    } else if (brief.contentJob === "explain") {
      lines.push(
        "- EXPLAIN rules: proof/context OK; still no engagement bait; no obsolete business-card metaphors; keep one clear thesis.",
      );
    } else {
      lines.push(
        "- CONVERT rules: short; CTA = DM or link only; never comment/like bait.",
      );
    }
  }

  if (brief.channelOwner) {
    lines.push(`CHANNEL OWNER: ${brief.channelOwner}`);
    if (brief.channelOwner === "gregory") {
      lines.push(
        "- Voice: Gregory personal LinkedIn (Charles rules). Mandatory short PS (who/where/what) at the end of every post. Do not write as LA MESA brand voice.",
      );
    } else if (brief.channelOwner === "la_mesa") {
      lines.push(
        "- Voice: LA MESA brand / member-facing (Lucy rules). Sign as LA MESA or founder context — not a NextStep market-entry consulting pitch.",
      );
    }
  }

  if (brief.productFrame) {
    lines.push(`PRODUCT FRAME: ${brief.productFrame}`);
    if (brief.productFrame === "la_mesa_dinners") {
      lines.push(
        "- Product = private thematic dinners in Guadalajara (mesa chica, one theme, selected profiles, invite when fit). Audience is primarily Mexican / GDL.",
        "- Do NOT pitch European SME market-entry, LatAm expansion consulting, or “desarrollo internacional” as the main subject unless the brief explicitly asks.",
        "- Table transparency: composition (theme, level, sectors/roles) OK — never promise a nominative guest list.",
        "- Ban obsolete metaphors: business cards / tarjetas / cartes de visite piles. Prefer cocktail pitch rooms, weak first intros, everyone selling / nobody listening.",
      );
    } else if (brief.productFrame === "nextstep_market_entry") {
      lines.push(
        "- Product = NextStep / market-entry Mexico & LatAm for PME/ETI and funds. LA MESA dinners are optional bridge only if brief asks.",
      );
    }
  }

  const tagCount = resolveLinkedInHashtagCount(brief);
  if (
    brief.contentJob ||
    brief.channelOwner ||
    brief.productFrame
  ) {
    lines.push(`- Hashtags: exactly ${tagCount} (no more).`);
  }

  if (lines.length === 0) return "";
  return `EDITORIAL OS (non-negotiable when set):\n${lines.join("\n")}`;
}
