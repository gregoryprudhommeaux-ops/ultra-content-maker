import type { ContentLanguage } from "@/types/workspace";

const VERSION_LINE_RE =
  /^>\s*Version\s+(?:numéro|number|número)\s+\d+[^\n]*\n?/im;

const VERSION_MARKERS = [
  /^>\s*Version\s+numéro\s+\d+/im,
  /^>\s*Version\s+number\s+\d+/im,
  /^>\s*Version\s+número\s+\d+/im,
];

export function stripVersionHeader(promptText: string): string {
  let text = promptText.trimStart();
  for (const re of VERSION_MARKERS) {
    if (re.test(text)) {
      text = text.replace(VERSION_LINE_RE, "").trimStart();
      break;
    }
  }
  return text;
}

function formatDate(date: Date, lang: ContentLanguage): string {
  const locale = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatVersionLine(
  versionNumber: number,
  updatedAt: Date,
  lang: ContentLanguage,
): string {
  const date = formatDate(updatedAt, lang);
  if (lang === "fr") {
    return `> Version numéro ${versionNumber}, suite à la mise à jour du ${date}.`;
  }
  if (lang === "es") {
    return `> Versión número ${versionNumber}, tras la actualización del ${date}.`;
  }
  return `> Version number ${versionNumber}, following the update on ${date}.`;
}

export function applyVersionHeader(
  promptText: string,
  versionNumber: number,
  updatedAt: Date,
  lang: ContentLanguage,
): string {
  const body = stripVersionHeader(promptText).trim();
  const line = formatVersionLine(versionNumber, updatedAt, lang);
  return body ? `${line}\n\n${body}` : line;
}

export function parseVersionNumber(promptText: string): number | null {
  const m = promptText.match(
    /^>\s*Version\s+(?:numéro|number|número)\s+(\d+)/im,
  );
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}
