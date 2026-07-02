import { FieldValue, type DocumentData, type Firestore, type Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { getAdminStorage } from "@/lib/firebase/admin";
import type { AuthorBioDocument } from "@/types/workspace";
import {
  extractTextFromLink,
  extractTextFromUpload,
  BIO_DOC_MAX_BYTES,
} from "./extract-document-text.server";
import { serializeBioDocumentsForPrompt } from "./bio-documents-utils";

export { serializeBioDocumentsForPrompt };

const COLLECTION = "bioDocuments";

function bioDocRef(db: Firestore, ownerId: string, accountId: string, docId: string) {
  return db.doc(`users/${ownerId}/accounts/${accountId}/${COLLECTION}/${docId}`);
}

function storagePathFor(
  ownerId: string,
  accountId: string,
  docId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120);
  return `users/${ownerId}/accounts/${accountId}/bioDocuments/${docId}/${safeName}`;
}

function mapBioDoc(id: string, data: DocumentData): AuthorBioDocument {
  const createdAt = data.createdAt as Timestamp | undefined;
  const updatedAt = data.updatedAt as Timestamp | undefined;
  return {
    id,
    kind: data.kind === "link" ? "link" : "file",
    label: String(data.label ?? "Document"),
    mimeType: data.mimeType ? String(data.mimeType) : undefined,
    sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : undefined,
    storagePath: data.storagePath ? String(data.storagePath) : undefined,
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
    extractedText: String(data.extractedText ?? ""),
    createdAt: createdAt?.toDate() ?? new Date(),
    updatedAt: updatedAt?.toDate() ?? new Date(),
  };
}

export async function listBioDocumentsServer(
  db: Firestore,
  ownerId: string,
  accountId: string,
): Promise<AuthorBioDocument[]> {
  const snap = await db
    .collection(`users/${ownerId}/accounts/${accountId}/${COLLECTION}`)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => mapBioDoc(doc.id, doc.data()));
}

export async function addBioDocumentFromFile(
  db: Firestore,
  input: {
    ownerId: string;
    accountId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  },
): Promise<AuthorBioDocument> {
  if (input.buffer.byteLength > BIO_DOC_MAX_BYTES) {
    throw new Error("file_too_large");
  }

  const extractedText = await extractTextFromUpload(
    input.buffer,
    input.mimeType,
    input.fileName,
  );
  if (!extractedText.trim()) {
    throw new Error("empty_extracted_text");
  }

  const docId = randomUUID();
  const path = storagePathFor(input.ownerId, input.accountId, docId, input.fileName);
  const storage = getAdminStorage();
  if (storage) {
    const bucket = storage.bucket();
    const file = bucket.file(path);
    await file.save(input.buffer, {
      contentType: input.mimeType || "application/octet-stream",
      resumable: false,
    });
  }

  const record = {
    kind: "file" as const,
    label: input.fileName,
    mimeType: input.mimeType || null,
    sizeBytes: input.buffer.byteLength,
    storagePath: path,
    sourceUrl: null,
    extractedText,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await bioDocRef(db, input.ownerId, input.accountId, docId).set(record);
  const saved = await bioDocRef(db, input.ownerId, input.accountId, docId).get();
  return mapBioDoc(docId, saved.data() ?? record);
}

export async function addBioDocumentFromLink(
  db: Firestore,
  input: {
    ownerId: string;
    accountId: string;
    url: string;
    label?: string;
  },
): Promise<AuthorBioDocument> {
  const extractedText = await extractTextFromLink(input.url);
  if (!extractedText.trim()) {
    throw new Error("empty_extracted_text");
  }

  const docId = randomUUID();
  const record = {
    kind: "link" as const,
    label: input.label?.trim() || input.url.trim(),
    mimeType: null,
    sizeBytes: null,
    storagePath: null,
    sourceUrl: input.url.trim(),
    extractedText,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await bioDocRef(db, input.ownerId, input.accountId, docId).set(record);
  const saved = await bioDocRef(db, input.ownerId, input.accountId, docId).get();
  return mapBioDoc(docId, saved.data() ?? record);
}

export async function deleteBioDocumentServer(
  db: Firestore,
  ownerId: string,
  accountId: string,
  docId: string,
): Promise<void> {
  const ref = bioDocRef(db, ownerId, accountId, docId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("not_found");

  const storagePath = snap.data()?.storagePath as string | undefined;
  if (storagePath) {
    const storage = getAdminStorage();
    if (storage) {
      await storage
        .bucket()
        .file(storagePath)
        .delete()
        .catch(() => {});
    }
  }

  await ref.delete();
}

