import { defaultEmailTemplate, defaultLocaleContent } from "@/lib/email/ucm-template-defaults";
import type {
  UcmEmailTemplateDoc,
  UcmEmailTemplateKey,
  UcmEmailTemplateLocaleContent,
  UcmTemplateLocale,
  UcmTemplateVars,
} from "@/lib/email/ucm-template-types";
import {
  isCustomUcmEmailTemplateKey,
  isSystemUcmEmailTemplateKey,
  resolveUcmTemplateLocale,
  SYSTEM_UCM_EMAIL_TEMPLATE_KEYS,
  UCM_EMAIL_TEMPLATES_COLLECTION,
} from "@/lib/email/ucm-template-types";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export {
  defaultEmailTemplate,
  defaultLocaleContent,
} from "@/lib/email/ucm-template-defaults";
export * from "@/lib/email/ucm-template-types";

export function applyUcmTemplateVars(text: string, vars: UcmTemplateVars): string {
  const fallbackName = vars.fullName?.trim() || "là";
  const firstName =
    vars.firstName?.trim() ||
    fallbackName.split(/\s+/)[0] ||
    fallbackName;
  return text
    .replaceAll("{{fullName}}", vars.fullName?.trim() || firstName)
    .replaceAll("{{firstName}}", firstName)
    .replaceAll("{{email}}", vars.email ?? "")
    .replaceAll("{{dashboardUrl}}", vars.dashboardUrl ?? "")
    .replaceAll("{{createUrl}}", vars.createUrl ?? "")
    .replaceAll("{{libraryUrl}}", vars.libraryUrl ?? "")
    .replaceAll("{{upgradeUrl}}", vars.upgradeUrl ?? "")
    .replaceAll("{{loginUrl}}", vars.loginUrl ?? "")
    .replaceAll("{{settingsUrl}}", vars.settingsUrl ?? "")
    .replaceAll("{{idea1Title}}", vars.idea1Title ?? "")
    .replaceAll("{{idea1Why}}", vars.idea1Why ?? "")
    .replaceAll("{{idea2Title}}", vars.idea2Title ?? "")
    .replaceAll("{{idea2Why}}", vars.idea2Why ?? "")
    .replaceAll("{{trialDaysLeft}}", vars.trialDaysLeft ?? "");
}

function pickLocaleContent(
  locales: Partial<Record<UcmTemplateLocale, UcmEmailTemplateLocaleContent>> | undefined,
  locale: UcmTemplateLocale,
  key: UcmEmailTemplateKey,
): UcmEmailTemplateLocaleContent {
  const fromStore = locales?.[locale];
  if (fromStore?.subject?.trim() && fromStore?.body?.trim()) return fromStore;
  for (const loc of ["fr", "en", "es"] as UcmTemplateLocale[]) {
    const alt = locales?.[loc];
    if (alt?.subject?.trim() && alt?.body?.trim()) return alt;
  }
  return defaultLocaleContent(key, locale);
}

export async function getUcmEmailTemplate(
  key: UcmEmailTemplateKey,
  locale?: string | null,
): Promise<UcmEmailTemplateDoc> {
  const resolved = resolveUcmTemplateLocale(locale);
  const fallback = defaultEmailTemplate(key, resolved);

  if (!isFirebaseAdminConfigured()) return fallback;
  const db = getAdminFirestore();
  if (!db) return fallback;

  try {
    const snap = await db.collection(UCM_EMAIL_TEMPLATES_COLLECTION).doc(key).get();
    if (!snap.exists) return fallback;
    const data = snap.data() as Partial<UcmEmailTemplateDoc>;
    const locales = data.locales ?? fallback.locales;
    const content = pickLocaleContent(locales, resolved, key);
    return {
      key,
      subject: content.subject,
      body: content.body,
      locale: resolved,
      locales,
      enabled: data.enabled !== false,
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
      label: typeof data.label === "string" ? data.label : fallback.label,
      custom: data.custom === true || isCustomUcmEmailTemplateKey(key),
    };
  } catch {
    return fallback;
  }
}

export async function listUcmEmailTemplates(
  locale?: string | null,
): Promise<UcmEmailTemplateDoc[]> {
  const resolved = resolveUcmTemplateLocale(locale);
  const system = await Promise.all(
    SYSTEM_UCM_EMAIL_TEMPLATE_KEYS.map((key) => getUcmEmailTemplate(key, resolved)),
  );

  if (!isFirebaseAdminConfigured()) return system;
  const db = getAdminFirestore();
  if (!db) return system;

  try {
    const snap = await db.collection(UCM_EMAIL_TEMPLATES_COLLECTION).get();
    const customs: UcmEmailTemplateDoc[] = [];
    for (const doc of snap.docs) {
      const key = doc.id;
      if (!isCustomUcmEmailTemplateKey(key)) continue;
      customs.push(await getUcmEmailTemplate(key, resolved));
    }
    customs.sort((a, b) => (a.label ?? a.key).localeCompare(b.label ?? b.key));
    return [...system, ...customs];
  } catch {
    return system;
  }
}

export function isValidUcmTemplateKey(key: string): key is UcmEmailTemplateKey {
  return isSystemUcmEmailTemplateKey(key) || isCustomUcmEmailTemplateKey(key);
}
