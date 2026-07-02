import type { AuthorBioDocument } from "@/types/workspace";

export const BIO_DOC_ACCEPT =
  ".pdf,.txt,.md,.markdown,.doc,.docx,application/pdf,text/plain,text/markdown";

export const BIO_DOC_MAX_MB = 10;

export function serializeBioDocumentsForPrompt(
  docs: AuthorBioDocument[],
): { label: string; kind: string; sourceUrl?: string; text: string }[] {
  return docs
    .filter((doc) => doc.extractedText.trim().length > 0)
    .map((doc) => ({
      label: doc.label,
      kind: doc.kind,
      sourceUrl: doc.sourceUrl,
      text: doc.extractedText.slice(0, 12_000),
    }));
}
