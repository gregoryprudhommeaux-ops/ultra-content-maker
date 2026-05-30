/**
 * Grant Firebase Auth custom claim `platformAdmin: true` to a user UID.
 *
 * Usage:
 *   npm run admin:set-claim -- uAmcN4TaGRb6tnJ6LS9c6wdCDCz1
 *
 * Loads `.env.local` when FIREBASE_* vars are missing.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { PLATFORM_ADMIN_CLAIM } from "../src/lib/workspace/platform-admin";

function loadEnvLocal(): void {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const uid = process.argv[2]?.trim();
  if (!uid) {
    console.error("Usage: npm run admin:set-claim -- <firebase-auth-uid>");
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY");
    console.error("Add them to .env.local or export them in your shell.");
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
  console.log("Sign out and sign in again so the new claim appears in your ID token.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
