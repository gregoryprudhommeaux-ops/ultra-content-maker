import {
  extractTextFromImage,
  isImageUpload,
} from "./extract-image-text.server";

const MAX_EXTRACTED_CHARS = 80_000;

export const BIO_DOC_MAX_BYTES = 10 * 1024 * 1024;

function clampText(text: string): string {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= MAX_EXTRACTED_CHARS) return normalized;
  return `${normalized.slice(0, MAX_EXTRACTED_CHARS)}\n\n[… truncated]`;
}

export function parseGoogleDocumentId(url: string): string | null {
  const trimmed = url.trim();
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (
    data: Buffer,
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

async function fetchGoogleDocText(docId: string): Promise<string> {
  const res = await fetch(
    `https://docs.google.com/document/d/${docId}/export?format=txt`,
    { redirect: "follow" },
  );
  if (!res.ok) {
    throw new Error("google_doc_not_accessible");
  }
  return res.text();
}

export async function extractTextFromUpload(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const lower = fileName.toLowerCase();
  const type = mimeType.toLowerCase();

  if (type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return clampText(buffer.toString("utf8"));
  }

  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    return clampText(await extractPdfText(buffer));
  }

  if (isImageUpload(type, lower)) {
    return clampText(await extractTextFromImage(buffer, mimeType, fileName));
  }

  throw new Error("unsupported_file_type");
}

export async function extractTextFromLink(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("invalid_link");

  const googleDocId = parseGoogleDocumentId(trimmed);
  if (googleDocId) {
    return clampText(await fetchGoogleDocText(googleDocId));
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const res = await fetch(trimmed, { redirect: "follow" });
    if (!res.ok) throw new Error("link_not_accessible");
    const contentType = res.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (contentType.includes("pdf") || trimmed.toLowerCase().endsWith(".pdf")) {
      return clampText(await extractPdfText(buffer));
    }
    if (contentType.startsWith("text/") || contentType.includes("markdown")) {
      return clampText(buffer.toString("utf8"));
    }
    throw new Error("unsupported_link_type");
  }

  throw new Error("invalid_link");
}
