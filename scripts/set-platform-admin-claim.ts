/**
 * Grant Firebase Auth custom claim `platformAdmin: true` to a user UID.
 *
 * Usage:
 *   npx tsx scripts/set-platform-admin-claim.ts uAmcN4TaGRb6tnJ6LS9c6wdCDCz1
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in env
 * (same as Vercel / .env.local Admin SDK).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PLATFORM_ADMIN_CLAIM } from "../src/lib/workspace/platform-admin";

const uid = process.argv[2]?.trim();
if (!uid) {
  console.error("Usage: npx tsx scripts/set-platform-admin-claim.ts <firebase-auth-uid>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const auth = getAuth();
const user = await auth.getUser(uid);
const existing = (user.customClaims ?? {}) as Record<string, unknown>;

await auth.setCustomUserClaims(uid, {
  ...existing,
  [PLATFORM_ADMIN_CLAIM]: true,
});

console.log(`OK: ${PLATFORM_ADMIN_CLAIM}=true for ${user.email ?? uid} (${uid})`);
console.log("The user must sign out and sign in again (or wait ~1h) for the new claim in their token.");
