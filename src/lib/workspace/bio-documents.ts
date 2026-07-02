import { collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { getClientFirestore } from "@/lib/firebase/client";
import type { AuthorBioDocument } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import { getActiveWorkspaceScope, requireWorkspaceScope } from "./workspace-scope";

function mapBioDoc(id: string, data: Record<string, unknown>): AuthorBioDocument {
  return {
    id,
    kind: data.kind === "link" ? "link" : "file",
    label: String(data.label ?? "Document"),
    mimeType: data.mimeType ? String(data.mimeType) : undefined,
    sizeBytes: typeof data.sizeBytes === "number" ? data.sizeBytes : undefined,
    storagePath: data.storagePath ? String(data.storagePath) : undefined,
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
    extractedText: String(data.extractedText ?? ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function bioDocumentsCollection(ownerId: string, accountId: string) {
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  return collection(db, "users", ownerId, "accounts", accountId, "bioDocuments");
}

export async function listBioDocuments(userId: string): Promise<AuthorBioDocument[]> {
  const scope = getActiveWorkspaceScope() ?? requireWorkspaceScope(userId);
  const snap = await getDocs(
    query(bioDocumentsCollection(scope.ownerId, scope.accountId), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => mapBioDoc(d.id, d.data() as Record<string, unknown>));
}

export async function deleteBioDocumentClient(
  userId: string,
  docId: string,
): Promise<void> {
  const scope = getActiveWorkspaceScope() ?? requireWorkspaceScope(userId);
  const db = getClientFirestore();
  if (!db) throw new Error("Firestore not available");
  await deleteDoc(
    doc(db, "users", scope.ownerId, "accounts", scope.accountId, "bioDocuments", docId),
  );
}
