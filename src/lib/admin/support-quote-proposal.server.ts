import {
  applyProposalPlaceholders,
  buildDefaultProposalDraft,
  parseSubjectFromDocument,
  proposalVariablesForQuote,
  type QuoteContentLocale,
  type SupportQuoteProposalDraft,
  type SupportQuoteProposalInput,
  type SupportQuoteProposalLocaleContent,
} from "@/lib/admin/support-quote-proposal-shared";
import { extractTextFromLink } from "@/lib/workspace/extract-document-text.server";

export type { SupportQuoteProposalDraft } from "@/lib/admin/support-quote-proposal-shared";
export {
  buildDefaultProposalDraft,
  normalizeProposalDraft,
  clientLocaleForQuote,
  proposalContentForLocale,
} from "@/lib/admin/support-quote-proposal-shared";

function buildLocaleContentFromInput(
  row: SupportQuoteProposalInput,
  locale: QuoteContentLocale,
): SupportQuoteProposalLocaleContent {
  return buildDefaultProposalDraft(row)[locale];
}

export async function buildProposalLocaleFromGoogleDoc(
  row: SupportQuoteProposalInput,
  locale: QuoteContentLocale,
  googleDocUrl: string,
): Promise<SupportQuoteProposalLocaleContent | null> {
  const raw = await extractTextFromLink(googleDocUrl);
  const variables = proposalVariablesForQuote(
    { ...row, email: row.email ?? "" },
    locale,
  );
  const filled = applyProposalPlaceholders(raw, variables);
  const parsed = parseSubjectFromDocument(filled);
  const fallback = buildLocaleContentFromInput(row, locale);
  const body = parsed.body || filled.trim();
  if (!body) return null;
  return {
    subject: parsed.subject
      ? applyProposalPlaceholders(parsed.subject, variables)
      : fallback.subject,
    rhythmLine: variables.rhythm,
    amountLine: variables.amount,
    body,
  };
}

export async function buildProposalDraftFromGoogleTemplates(
  row: SupportQuoteProposalInput,
  config: {
    fr?: { googleDocUrl: string };
    en?: { googleDocUrl: string };
    es?: { googleDocUrl: string };
  },
): Promise<SupportQuoteProposalDraft> {
  const draft = buildDefaultProposalDraft(row);
  const locales: QuoteContentLocale[] = ["fr", "en", "es"];

  await Promise.all(
    locales.map(async (locale) => {
      const url = config[locale]?.googleDocUrl;
      if (!url) return;
      try {
        const content = await buildProposalLocaleFromGoogleDoc(row, locale, url);
        if (content) draft[locale] = content;
      } catch {
        /* keep built-in default for this locale */
      }
    }),
  );

  return draft;
}
