import PDFDocument from "pdfkit";
import { cgvBlock } from "@/lib/admin/support-deal-terms";
import {
  buildDefaultProposalDraft,
  clientLocaleForQuote,
  proposalContentForLocale,
  type QuoteContentLocale,
  type SupportQuoteProposalDraft,
} from "@/lib/admin/support-quote-proposal-shared";
import type { SupportQuoteRow } from "@/lib/admin/support-quotes.server";

function resolveDraft(row: SupportQuoteRow): SupportQuoteProposalDraft {
  return row.proposalDraft ?? buildDefaultProposalDraft(row);
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateSupportProposalPdf(
  row: SupportQuoteRow,
  localeOverride?: QuoteContentLocale,
): Promise<Buffer> {
  const locale = localeOverride ?? clientLocaleForQuote(row);
  const draft = resolveDraft(row);
  const content = proposalContentForLocale(draft, locale);
  const cgv = cgvBlock(locale);

  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.fontSize(18).font("Helvetica-Bold").text(content.subject, { align: "left" });
  doc.moveDown(0.75);

  doc.fontSize(11).font("Helvetica");
  if (content.rhythmLine) {
    doc.font("Helvetica-Bold").text(
      locale === "en" ? "Rhythm" : locale === "es" ? "Ritmo" : "Rythme",
      { continued: false },
    );
    doc.font("Helvetica").text(content.rhythmLine);
    doc.moveDown(0.5);
  }

  if (content.amountLine) {
    doc.font("Helvetica-Bold").text(
      locale === "en" ? "Investment" : locale === "es" ? "Inversión" : "Investissement",
    );
    doc.font("Helvetica").text(content.amountLine);
    doc.moveDown(0.75);
  }

  doc.font("Helvetica-Bold").text(
    locale === "en" ? "Proposal" : locale === "es" ? "Propuesta" : "Proposition",
  );
  doc.moveDown(0.35);
  doc.font("Helvetica").text(content.body, { align: "left", lineGap: 3 });
  doc.moveDown(1);

  doc.font("Helvetica-Bold").text(
    locale === "en"
      ? "Standard terms"
      : locale === "es"
        ? "Condiciones generales"
        : "Conditions générales",
  );
  doc.moveDown(0.35);
  doc.font("Helvetica").text(cgv, { lineGap: 3 });

  return pdfToBuffer(doc);
}
