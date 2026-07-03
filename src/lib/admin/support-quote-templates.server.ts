import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { buildDefaultProposalDraft, type QuoteContentLocale } from "@/lib/admin/support-quote-proposal-shared";
import { buildProposalDraftFromGoogleTemplates } from "@/lib/admin/support-quote-proposal.server";
import type { SupportQuoteRow } from "@/lib/admin/support-quotes.server";
import { parseGoogleDocumentId } from "@/lib/workspace/extract-document-text.server";

export type SupportQuoteTemplateLocaleConfig = {
  googleDocUrl: string;
  googleDocId: string;
};

export type SupportQuoteTemplateConfig = {
  fr?: SupportQuoteTemplateLocaleConfig;
  en?: SupportQuoteTemplateLocaleConfig;
  es?: SupportQuoteTemplateLocaleConfig;
  updatedAt?: string | null;
};

const LOCALES: QuoteContentLocale[] = ["fr", "en", "es"];

function configRef(db: Firestore) {
  return db.collection("platform").doc("supportQuoteTemplates");
}

function localeFromEnv(locale: QuoteContentLocale): SupportQuoteTemplateLocaleConfig | undefined {
  const key =
    locale === "fr"
      ? process.env.SUPPORT_QUOTE_TEMPLATE_DOC_FR
      : locale === "en"
        ? process.env.SUPPORT_QUOTE_TEMPLATE_DOC_EN
        : process.env.SUPPORT_QUOTE_TEMPLATE_DOC_ES;
  const url = key?.trim();
  if (!url) return undefined;
  const googleDocId = parseGoogleDocumentId(url);
  if (!googleDocId) return undefined;
  return { googleDocUrl: url, googleDocId };
}

function normalizeLocaleBlock(raw: unknown): SupportQuoteTemplateLocaleConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const googleDocUrl = typeof r.googleDocUrl === "string" ? r.googleDocUrl.trim() : "";
  const googleDocId =
    typeof r.googleDocId === "string"
      ? r.googleDocId.trim()
      : googleDocUrl
        ? parseGoogleDocumentId(googleDocUrl) ?? ""
        : "";
  if (!googleDocUrl || !googleDocId) return undefined;
  return { googleDocUrl, googleDocId };
}

export function googleDocEditUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`;
}

export async function getSupportQuoteTemplateConfig(
  db: Firestore,
): Promise<SupportQuoteTemplateConfig> {
  const snap = await configRef(db).get();
  const data = snap.data() ?? {};
  return {
    fr: normalizeLocaleBlock(data.fr) ?? localeFromEnv("fr"),
    en: normalizeLocaleBlock(data.en) ?? localeFromEnv("en"),
    es: normalizeLocaleBlock(data.es) ?? localeFromEnv("es"),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  };
}

export async function saveSupportQuoteTemplateConfig(
  db: Firestore,
  input: Partial<Record<QuoteContentLocale, string>>,
): Promise<SupportQuoteTemplateConfig> {
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const locale of LOCALES) {
    const rawUrl = input[locale]?.trim() ?? "";
    if (!rawUrl) {
      patch[locale] = null;
      continue;
    }
    const googleDocId = parseGoogleDocumentId(rawUrl);
    if (!googleDocId) {
      throw new Error(`invalid_doc_url_${locale}`);
    }
    patch[locale] = { googleDocUrl: rawUrl, googleDocId };
  }

  await configRef(db).set(patch, { merge: true });
  return getSupportQuoteTemplateConfig(db);
}

export async function buildProposalDraftForQuote(db: Firestore, row: SupportQuoteRow) {
  const config = await getSupportQuoteTemplateConfig(db);
  const hasAny = LOCALES.some((locale) => config[locale]?.googleDocUrl);
  if (!hasAny) return buildDefaultProposalDraft(row);
  return buildProposalDraftFromGoogleTemplates(row, config);
}
