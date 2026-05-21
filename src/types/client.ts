export type OnboardingStatus = "not_started" | "in_progress" | "completed";
export type BrainStatus = "none" | "draft" | "validated";
export type ContentLanguage = "en" | "fr" | "es";

export interface Client {
  id: string;
  name: string;
  clientTypeLabel: string;
  contentLanguage: ContentLanguage;
  sector?: string;
  notes?: string;
  onboardingStatus: OnboardingStatus;
  brainStatus: BrainStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientInput {
  name: string;
  clientTypeLabel: string;
  contentLanguage: ContentLanguage;
  sector?: string;
  notes?: string;
}
