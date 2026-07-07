import {
 addDoc,
 collection,
 doc,
 getDoc,
 getDocs,
 orderBy,
 query,
 serverTimestamp,
 updateDoc,
} from "firebase/firestore";
import type { CtaDoc } from "@/types/workspace";
import { toDate } from "./firestore-utils";
import {
 activeWorkspaceOwnerId,
 allowsLegacyWorkspaceFallback,
 legacyCollectionRef,
 legacyDocRef,
 workspaceCollectionRef,
 workspaceDocRef,
} from "./workspace-scope";

function ctasCollection(userId: string) {
 return workspaceCollectionRef(userId, "ctas");
}

async function listCtasSnap(userId: string) {
 const q = query(ctasCollection(userId), orderBy("updatedAt", "desc"));
 const scoped = await getDocs(q);
 if (!scoped.empty) return scoped;
 if (!allowsLegacyWorkspaceFallback(userId)) return scoped;
 return getDocs(
  query(legacyCollectionRef(activeWorkspaceOwnerId(userId), "ctas"), orderBy("updatedAt", "desc")),
 );
}

export async function listCtas(userId: string): Promise<CtaDoc[]> {
 const snap = await listCtasSnap(userId);
 return snap.docs.map((d) => {
 const data = d.data();
 return {
 id: d.id,
 label: data.label as string,
 text: data.text as string,
 linkUrl: data.linkUrl as string | undefined,
 isDefault: data.isDefault as boolean | undefined,
 createdAt: toDate(data.createdAt),
 updatedAt: toDate(data.updatedAt),
 };
 });
}

export async function getCta(userId: string, ctaId: string): Promise<CtaDoc | null> {
 let snap = await getDoc(workspaceDocRef(userId, "ctas", ctaId));
 if (!snap.exists() && allowsLegacyWorkspaceFallback(userId)) {
 snap = await getDoc(legacyDocRef(activeWorkspaceOwnerId(userId), "ctas", ctaId));
 }
 if (!snap.exists()) return null;
 const data = snap.data();
 return {
 id: snap.id,
 label: data.label as string,
 text: data.text as string,
 linkUrl: data.linkUrl as string | undefined,
 isDefault: data.isDefault as boolean | undefined,
 createdAt: toDate(data.createdAt),
 updatedAt: toDate(data.updatedAt),
 };
}

export async function createCta(
 userId: string,
 input: { label: string; text: string; linkUrl?: string; isDefault?: boolean },
): Promise<string> {
 const ref = await addDoc(ctasCollection(userId), {
 label: input.label.trim(),
 text: input.text.trim(),
 linkUrl: input.linkUrl?.trim() || null,
 isDefault: input.isDefault ?? false,
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp(),
 });
 return ref.id;
}

export async function ensureDefaultCta(userId: string): Promise<CtaDoc> {
 const existing = await listCtas(userId);
 const def = existing.find((c) => c.isDefault) ?? existing[0];
 if (def) return def;
 const id = await createCta(userId, {
 label: "Default",
 text: "👉 Découvrez comment nous pouvons vous aider · commentez ou envoyez-moi un message.",
 isDefault: true,
 });
 const created = await getCta(userId, id);
 if (!created) throw new Error("CTA create failed");
 return created;
}
