import type { ArticleIllustration, RepostSuggestion } from "@/types/workspace";

export type AgencyDeliveryPackInput = {
  exportText: string;
  illustration?: ArticleIllustration | null;
  repostSuggestions?: RepostSuggestion[] | null;
  pillarLabel?: string;
};

export function buildAgencyDeliveryPack(input: AgencyDeliveryPackInput): string {
  const sections: string[] = [];

  sections.push("=== POST LINKEDIN ===");
  sections.push(input.exportText.trim());

  if (input.pillarLabel?.trim()) {
    sections.push("");
    sections.push(`Pilier éditorial : ${input.pillarLabel.trim()}`);
  }

  const ill = input.illustration;
  if (
    ill &&
    (ill.visualConcept ||
      ill.overlayTitle ||
      ill.overlaySubtitle ||
      ill.canvaPrompt ||
      ill.rationale)
  ) {
    sections.push("");
    sections.push("=== PACK VISUEL ===");
    if (ill.visualConcept) {
      sections.push("");
      sections.push("Concept visuel");
      sections.push(ill.visualConcept);
    }
    if (ill.overlayTitle || ill.overlaySubtitle) {
      sections.push("");
      sections.push("Texte overlay");
      if (ill.overlayTitle) sections.push(`Titre : ${ill.overlayTitle}`);
      if (ill.overlaySubtitle) sections.push(`Sous-titre : ${ill.overlaySubtitle}`);
    }
    if (ill.canvaPrompt) {
      sections.push("");
      sections.push("Prompt Canva / design");
      sections.push(ill.canvaPrompt);
    }
    if (ill.rationale && !ill.visualConcept) {
      sections.push("");
      sections.push("Direction visuelle");
      sections.push(ill.rationale);
    }
    if (ill.imagePrompts?.length) {
      sections.push("");
      sections.push("Prompts image GenAI");
      ill.imagePrompts.forEach((p, i) => {
        sections.push(`${i + 1}. ${p}`);
      });
    }
  }

  const reposts = input.repostSuggestions?.filter((r) => r.repostText.trim()) ?? [];
  if (reposts.length > 0) {
    sections.push("");
    sections.push("=== REPOSTS ÉQUIPE ===");
    for (const r of reposts) {
      sections.push("");
      sections.push(`${r.memberName}${r.memberRole ? ` · ${r.memberRole}` : ""}`);
      sections.push(r.repostText);
    }
  }

  return sections.join("\n").trim();
}
