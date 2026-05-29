import type { LearningEntry } from "@/lib/workspace/learning-profile";
import type {
  AudienceProfile,
  AuthorProfile,
  ContentLanguage,
  PersonaUpdateSource,
} from "@/types/workspace";

export function profileFingerprint(
  author: AuthorProfile | null,
  audience: AudienceProfile | null,
): string {
  return JSON.stringify({
    roleTitle: author?.roleTitle?.trim() ?? "",
    positioningLine: author?.positioningLine?.trim() ?? "",
    linkedinProfileUrl: author?.linkedinProfileUrl?.trim() ?? "",
    linkedinActivityUrl: author?.linkedinActivityUrl?.trim() ?? "",
    websiteUrl: author?.websiteUrl?.trim() ?? "",
    blogUrl: author?.blogUrl?.trim() ?? "",
    creationStrategySteering: author?.creationStrategySteering?.trim() ?? "",
    targetLabel: audience?.targetLabel?.trim() ?? "",
    contentFocus: audience?.contentFocus?.trim() ?? "",
    optionalNotes: audience?.optionalNotes?.trim() ?? "",
    newsInterestQuery: audience?.newsInterestQuery?.trim() ?? "",
    audienceSkipped: audience?.skipped ?? false,
  });
}

const FIELD_LABELS: Record<
  ContentLanguage,
  Record<string, string>
> = {
  fr: {
    roleTitle: "rôle",
    positioningLine: "positionnement",
    linkedinProfileUrl: "LinkedIn profil",
    linkedinActivityUrl: "activité LinkedIn",
    websiteUrl: "site web",
    blogUrl: "blog",
    creationStrategySteering: "pilotage stratégie",
    targetLabel: "cible",
    contentFocus: "focus contenu",
    optionalNotes: "notes audience",
    newsInterestQuery: "mots-clés actus",
  },
  en: {
    roleTitle: "role",
    positioningLine: "positioning",
    linkedinProfileUrl: "LinkedIn profile",
    linkedinActivityUrl: "LinkedIn activity",
    websiteUrl: "website",
    blogUrl: "blog",
    creationStrategySteering: "strategy steering",
    targetLabel: "target",
    contentFocus: "content focus",
    optionalNotes: "audience notes",
    newsInterestQuery: "news keywords",
  },
  es: {
    roleTitle: "rol",
    positioningLine: "posicionamiento",
    linkedinProfileUrl: "perfil LinkedIn",
    linkedinActivityUrl: "actividad LinkedIn",
    websiteUrl: "sitio web",
    blogUrl: "blog",
    creationStrategySteering: "dirección estrategia",
    targetLabel: "objetivo",
    contentFocus: "enfoque contenido",
    optionalNotes: "notas audiencia",
    newsInterestQuery: "palabras clave noticias",
  },
};

export function summarizeProfileDelta(
  prevFingerprint: string | undefined,
  author: AuthorProfile | null,
  audience: AudienceProfile | null,
  lang: ContentLanguage,
): string | null {
  const next = profileFingerprint(author, audience);
  if (!prevFingerprint || prevFingerprint === next) return null;

  let prev: Record<string, string>;
  try {
    prev = JSON.parse(prevFingerprint) as Record<string, string>;
  } catch {
    return profileSummaryGeneric(lang);
  }

  const nextObj = JSON.parse(next) as Record<string, string>;
  const labels = FIELD_LABELS[lang] ?? FIELD_LABELS.fr;
  const changed: string[] = [];

  for (const key of Object.keys(labels)) {
    if ((prev[key] ?? "") !== (nextObj[key] ?? "")) {
      changed.push(labels[key] ?? key);
    }
  }

  if (changed.length === 0) return profileSummaryGeneric(lang);
  if (lang === "fr") {
    return `Profil mis à jour : ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}.`;
  }
  if (lang === "es") {
    return `Perfil actualizado: ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}.`;
  }
  return `Profile updated: ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}.`;
}

function profileSummaryGeneric(lang: ContentLanguage): string {
  if (lang === "fr") return "Profil auteur / audience synchronisé dans le Persona.";
  if (lang === "es") return "Perfil autor / audiencia sincronizado en el Persona.";
  return "Author / audience profile synced into Persona.";
}

export function summarizeNewLearningEntries(
  entries: LearningEntry[],
  lang: ContentLanguage,
  max = 3,
): string | null {
  if (entries.length === 0) return null;
  const texts = entries
    .map((e) => e.text.trim())
    .filter(Boolean)
    .slice(0, max);
  if (texts.length === 0) return null;

  const joined =
    texts.length === 1
      ? texts[0]
      : texts.map((t) => (t.length > 80 ? `${t.slice(0, 77)}…` : t)).join(" · ");

  if (lang === "fr") {
    return `Nouveaux retours intégrés : ${joined}`;
  }
  if (lang === "es") {
    return `Nuevos aprendizajes integrados: ${joined}`;
  }
  return `New feedback integrated: ${joined}`;
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
