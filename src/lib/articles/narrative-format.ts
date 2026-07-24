import type {
  NarrativePostFormat,
  PostBrief,
} from "@/types/workspace";

export const NARRATIVE_FORMATS: NarrativePostFormat[] = [
  "story",
  "method",
  "announce",
  "decrypt",
];

export function isNarrativePostFormat(v: unknown): v is NarrativePostFormat {
  return (
    v === "story" ||
    v === "method" ||
    v === "announce" ||
    v === "decrypt"
  );
}

/** Sensible default when entering a creation mode (user can clear → AI chooses). */
export function defaultNarrativeFormatForMode(
  mode: "profile" | "news" | "inspiration" | "article" | "interview" | null | undefined,
): NarrativePostFormat | undefined {
  switch (mode) {
    case "interview":
      return "story";
    case "news":
      return "decrypt";
    case "inspiration":
      return "method";
    case "article":
      return "story";
    case "profile":
      return "method";
    default:
      return undefined;
  }
}

const FORMAT_RULES: Record<NarrativePostFormat, string[]> = {
  story: [
    "NARRATIVE FORMAT: STORY (histoire)",
    "- Structure: scene or concrete moment → tension / stakes → field lesson (not a moral Wikipedia close).",
    "- Prefer first-person lived detail when the brief supports it · never invent clients, quotes, or metrics.",
    "- Hook opens in the middle of action or with a specific observation · avoid survey openers.",
  ],
  method: [
    "NARRATIVE FORMAT: METHOD (méthode)",
    "- Structure: ICP problem → clear steps or criteria → result / decision rule.",
    "- Practical and operational · numbered or sequenced moves OK if uneven and not a life-lesson list.",
    "- End with a usable takeaway the reader can apply · not engagement bait.",
  ],
  announce: [
    "NARRATIVE FORMAT: ANNOUNCE (annonce)",
    "- Structure: what is new → why it matters for the ICP → proof → one clear next step (soft, not hard sell in body).",
    "- Lead with the news/change · avoid buried lede and brochure feature dumps.",
    "- Company/product name only when the brief/angle requires it.",
  ],
  decrypt: [
    "NARRATIVE FORMAT: DECRYPT (décryptage)",
    "- Structure: market claim or signal → nuance / counter-read → author's position.",
    "- Analytical and opinionated · one thesis · cite the brief's news/source framing without pasting URLs in body.",
    "- Challenge received wisdom carefully · no insults, politics, or outrage bait.",
  ],
};

/** Prompt block for generation / revise when narrativeFormat is set. */
export function buildNarrativeFormatPromptBlock(
  brief: PostBrief | null | undefined,
): string {
  const format = brief?.narrativeFormat;
  if (!format || !isNarrativePostFormat(format)) return "";
  return FORMAT_RULES[format].join("\n");
}
