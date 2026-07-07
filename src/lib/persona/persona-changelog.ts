import type { LearningEntry } from "@/lib/workspace/learning-profile";
import type {
 AudienceProfile,
 AuthorProfile,
 ContentLanguage,
 GapAnswerValue,
 PersonaUpdateSource,
} from "@/types/workspace";
import { linkedInActivityUrlsFromProfile, migrateWebSources } from "@/lib/profile/author-reference-urls";

export function profileFingerprint(
 author: AuthorProfile | null,
 audience: AudienceProfile | null,
): string {
 return JSON.stringify({
 roleTitle: author?.roleTitle?.trim() ?? "",
 positioningLine: author?.positioningLine?.trim() ?? "",
 linkedinProfileUrl: author?.linkedinProfileUrl?.trim() ?? "",
 linkedinActivityUrl: author?.linkedinActivityUrl?.trim() ?? "",
 linkedinActivitySources: JSON.stringify(linkedInActivityUrlsFromProfile(author)),
 websiteUrl: author?.websiteUrl?.trim() ?? "",
 blogUrl: author?.blogUrl?.trim() ?? "",
 webSources: JSON.stringify(migrateWebSources(author).map((s) => s.url)),
 creationStrategySteering: author?.creationStrategySteering?.trim() ?? "",
 targetLabel: audience?.targetLabel?.trim() ?? "",
 contentFocus: audience?.contentFocus?.trim() ?? "",
 optionalNotes: audience?.optionalNotes?.trim() ?? "",
 newsInterestQuery: audience?.newsInterestQuery?.trim() ?? "",
 audienceSkipped: audience?.skipped ?? false,
 });
}

export function enrichmentFingerprint(
 details: Record<string, GapAnswerValue>,
): string {
 return JSON.stringify(details);
}

/** Stable hash of learning entry texts (order matters · newest first). */
export function learningEntriesFingerprint(entries: LearningEntry[]): string {
 return entries.map((e) => e.text.trim()).join("\x1e");
}

function truncate(text: string, max = 120): string {
 const t = text.replace(/\s+/g, " ").trim();
 if (t.length <= max) return t;
 return `${t.slice(0, max - 1)}…`;
}

const FIELD_LABELS: Record<ContentLanguage, Record<string, string>> = {
 fr: {
 roleTitle: "Rôle",
 positioningLine: "Positionnement",
 linkedinProfileUrl: "LinkedIn",
 linkedinActivityUrl: "Activité LinkedIn",
 websiteUrl: "Site web",
 blogUrl: "Blog",
 creationStrategySteering: "Pilotage stratégie",
 targetLabel: "Cible",
 contentFocus: "Focus contenu",
 optionalNotes: "Notes",
 newsInterestQuery: "Mots-clés actus",
 },
 en: {
 roleTitle: "Role",
 positioningLine: "Positioning",
 linkedinProfileUrl: "LinkedIn",
 linkedinActivityUrl: "LinkedIn activity",
 websiteUrl: "Website",
 blogUrl: "Blog",
 creationStrategySteering: "Strategy steering",
 targetLabel: "Target",
 contentFocus: "Content focus",
 optionalNotes: "Notes",
 newsInterestQuery: "News keywords",
 },
 es: {
 roleTitle: "Rol",
 positioningLine: "Posicionamiento",
 linkedinProfileUrl: "LinkedIn",
 linkedinActivityUrl: "Actividad LinkedIn",
 websiteUrl: "Sitio web",
 blogUrl: "Blog",
 creationStrategySteering: "Dirección estrategia",
 targetLabel: "Objetivo",
 contentFocus: "Enfoque contenido",
 optionalNotes: "Notas",
 newsInterestQuery: "Palabras clave noticias",
 },
};

/** Human-readable lines with actual field values (not just field names). */
export function summarizeProfileDeltaDetailed(
 prevFingerprint: string | undefined,
 author: AuthorProfile | null,
 audience: AudienceProfile | null,
 lang: ContentLanguage,
): string[] {
 const next = profileFingerprint(author, audience);
 if (prevFingerprint && prevFingerprint === next) return [];

 let prev: Record<string, string> = {};
 if (prevFingerprint) {
 try {
 prev = JSON.parse(prevFingerprint) as Record<string, string>;
 } catch {
 prev = {};
 }
 }

 const nextObj = JSON.parse(next) as Record<string, string>;
 const labels = FIELD_LABELS[lang] ?? FIELD_LABELS.fr;
 const lines: string[] = [];

 for (const key of Object.keys(labels)) {
 const before = (prev[key] ?? "").trim();
 const after = (nextObj[key] ?? "").trim();
 if (before === after || !after) continue;
 lines.push(`${labels[key]} : ${truncate(after)}`);
 }

 if (lines.length === 0 && !prevFingerprint) {
 const intro =
 lang === "fr"
 ? "Profil initial enregistré"
 : lang === "es"
 ? "Perfil inicial registrado"
 : "Initial profile saved";
 if (nextObj.targetLabel?.trim()) {
 lines.push(`${intro} · ${labels.targetLabel} : ${truncate(nextObj.targetLabel)}`);
 }
 if (nextObj.contentFocus?.trim()) {
 lines.push(`${labels.contentFocus} : ${truncate(nextObj.contentFocus)}`);
 }
 if (nextObj.optionalNotes?.trim()) {
 lines.push(`${labels.optionalNotes} : ${truncate(nextObj.optionalNotes)}`);
 }
 if (nextObj.roleTitle?.trim()) {
 lines.push(`${labels.roleTitle} : ${truncate(nextObj.roleTitle)}`);
 }
 if (nextObj.positioningLine?.trim()) {
 lines.push(`${labels.positioningLine} : ${truncate(nextObj.positioningLine)}`);
 }
 }

 return lines;
}

/** Only entries that were not in the previous sync hash. */
export function summarizeLearningDelta(
 prevFingerprint: string | undefined,
 entries: LearningEntry[],
 lang: ContentLanguage,
): string[] {
 const prevTexts = new Set(
 prevFingerprint ? prevFingerprint.split("\x1e").filter(Boolean) : [],
 );
 const newOnes = entries
 .map((e) => e.text.trim())
 .filter((text) => text && !prevTexts.has(text));

 if (newOnes.length === 0) return [];

 const prefix =
 lang === "fr"
 ? "Retour article / préférence"
 : lang === "es"
 ? "Feedback post / preferencia"
 : "Post feedback / preference";

 return newOnes.slice(0, 5).map((text) => `${prefix} : ${truncate(text, 140)}`);
}

export function summarizeEnrichmentDelta(
 prevFingerprint: string | undefined,
 details: Record<string, GapAnswerValue>,
 lang: ContentLanguage,
): string[] {
 const next = enrichmentFingerprint(details);
 if (prevFingerprint === next) return [];
 const lines: string[] = [];
 const prefix =
 lang === "fr" ? "Profil complété" : lang === "es" ? "Perfil completado" : "Profile enrichment";

 for (const [key, value] of Object.entries(details).slice(0, 8)) {
 const text = Array.isArray(value) ? value.join(", ") : String(value).trim();
 if (!text) continue;
 lines.push(`${prefix} · ${key} : ${truncate(text)}`);
 }
 return lines;
}

export function buildSyncChangeSummary(parts: string[]): string | null {
 const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))];
 if (unique.length === 0) return null;
 return unique.join(" · ");
}

export function mapReasonToSource(reason: string): PersonaUpdateSource {
 switch (reason) {
 case "generate":
 return "generate";
 case "profile_sync":
 return "profile_sync";
 case "user_refinement":
 return "user_refinement";
 case "validate":
 return "validate";
 default:
 return "feedback_sync";
 }
}
