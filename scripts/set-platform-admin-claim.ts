/**
 * Grant Firebase Auth custom claim `platformAdmin: true` to a user UID.
 *
 * Usage:
 *   npm run admin:set-claim -- uAmcN4TaGRb6tnJ6LS9c6wdCDCz1
 *
 * Credentials (one of):
 *   - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   - .env.local: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   - gcloud ADC (no JSON key): see docs/ADMIN_SETUP.md
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
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
    if (process.env[key]?.trim()) continue;
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

function initAdminApp(): App {
  if (getApps().length) return getApps()[0]!;

  const jsonPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (jsonPath && existsSync(jsonPath) && jsonPath.endsWith(".json")) {
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!raw.project_id || !raw.client_email || !raw.private_key) {
      throw new Error(`Invalid service account JSON: ${jsonPath}`);
    }
    return initializeApp({
      credential: cert({
        projectId: raw.project_id,
        clientEmail: raw.client_email,
        privateKey: raw.private_key,
      }),
    });
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    "ultra-content-maker";

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  if (process.env.USE_GCLOUD_ADC === "1" || process.env.GOOGLE_APPLICATION_CREDENTIALS === "adc") {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  const missing = ["FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (or JSON key)"];
  console.error("Firebase Admin credentials are missing or empty.");
  console.error("");
  console.error("Your Firebase Console blocks JSON key download (org policy).");
  console.error("Use gcloud instead — no JSON file needed:");
  console.error("");
  console.error("  brew install google-cloud-sdk   # if needed");
  console.error("  gcloud auth login");
  console.error("  gcloud config set project ultra-content-maker");
  console.error("  gcloud auth application-default login");
  console.error("  USE_GCLOUD_ADC=1 npm run admin:set-claim -- <firebase-auth-uid>");
  console.error("");
  console.error("Or if Vercel already has Admin keys: vercel env pull .env.local");
  for (const key of missing) console.error(`  - ${key}`);
  process.exit(1);
}

async function main(): Promise<void> {
  loadEnvLocal();
  initAdminApp();

  const uid = process.argv[2]?.trim();
  if (!uid) {
    console.error("Usage: npm run admin:set-claim -- <firebase-auth-uid>");
    process.exit(1);
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
