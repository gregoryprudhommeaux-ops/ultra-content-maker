export type CreatorFunnelStage = "awareness" | "consideration" | "conversion";

export type CreatorRadarSuggestion = {
  id: string;
  name: string;
  headline: string;
  linkedinUrl: string;
  whyRelevant: string;
  lastPostAngle: string;
  funnelStage: CreatorFunnelStage;
};
