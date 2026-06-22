import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { randomBytes } from "crypto";
import type { LinkedWorkspace } from "@/types/workspace";

const INVITES_COLLECTION = "accountInvites";
const INVITE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type AccountInviteRecord = {
  ownerId: string;
  accountId: string;
  accountName: string;
  createdBy: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  usedBy?: string;
  usedAt?: Timestamp;
};

export type AccountInvitePreview = {
  token: string;
  accountName: string;
  expiresAt: string;
  status: "active" | "expired";
};

function inviteRef(db: Firestore, token: string) {
  return db.collection(INVITES_COLLECTION).doc(token);
}

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createAccountInvite(
  db: Firestore,
  input: {
    ownerId: string;
    accountId: string;
    accountName: string;
    createdBy: string;
  },
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await inviteRef(db, token).set({
    ownerId: input.ownerId,
    accountId: input.accountId,
    accountName: input.accountName.trim(),
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
  return { token, expiresAt };
}

export async function getAccountInvitePreview(
  db: Firestore,
  token: string,
): Promise<AccountInvitePreview | null> {
  const snap = await inviteRef(db, token).get();
  if (!snap.exists) return null;
  const data = snap.data() as AccountInviteRecord;
  const expiresAt = data.expiresAt.toDate();
  const status: AccountInvitePreview["status"] =
    expiresAt.getTime() < Date.now() ? "expired" : "active";
  return {
    token,
    accountName: data.accountName,
    expiresAt: expiresAt.toISOString(),
    status,
  };
}

export async function claimAccountInvite(
  db: Firestore,
  token: string,
  memberUid: string,
): Promise<LinkedWorkspace> {
  const ref = inviteRef(db, token);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("invite_not_found");

  const data = snap.data() as AccountInviteRecord;
  if (data.expiresAt.toDate().getTime() < Date.now()) throw new Error("invite_expired");

  const linkedWorkspace: LinkedWorkspace = {
    ownerId: data.ownerId,
    accountId: data.accountId,
    accountName: data.accountName,
  };

  await db.doc(`users/${memberUid}`).set(
    {
      linkedWorkspace,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await ref.update({
    usedBy: data.usedBy ?? memberUid,
    usedAt: data.usedAt ?? FieldValue.serverTimestamp(),
    lastClaimedBy: memberUid,
    lastClaimedAt: FieldValue.serverTimestamp(),
    claimCount: FieldValue.increment(1),
  });

  return linkedWorkspace;
}

export function buildInviteUrl(origin: string, locale: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/${locale}/invite/${token}`;
}
