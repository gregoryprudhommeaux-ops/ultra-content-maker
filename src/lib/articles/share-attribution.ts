import { getSiteUrl } from "@/lib/brand/site-url";
import type { ContentLanguage } from "@/types/workspace";

function marketingSiteUrl(): string {
 return `${getSiteUrl()}/?marketing=1`;
}

const ATTRIBUTION_TEMPLATE: Record<ContentLanguage, string> = {
 fr: "Cet article a été préparé avec ULTRA CONTENT MAKER ({url}) · le Ghostwriter IA pour LinkedIn.",
 en: "This article was prepared with ULTRA CONTENT MAKER ({url}) · the AI ghostwriter for LinkedIn.",
 es: "Este artículo se preparó con ULTRA CONTENT MAKER ({url}) · el ghostwriter IA para LinkedIn.",
};

const EMAIL_SUBJECT_TEMPLATE: Record<ContentLanguage, string> = {
 fr: "Relecture · {hook}",
 en: "Review · {hook}",
 es: "Revisión · {hook}",
};

export function getShareAttributionLine(contentLanguage: ContentLanguage): string {
 const template = ATTRIBUTION_TEMPLATE[contentLanguage] ?? ATTRIBUTION_TEMPLATE.en;
 return template.replace("{url}", marketingSiteUrl());
}

export function getShareEmailSubjectTemplate(
 contentLanguage: ContentLanguage,
): string {
 return EMAIL_SUBJECT_TEMPLATE[contentLanguage] ?? EMAIL_SUBJECT_TEMPLATE.en;
}
