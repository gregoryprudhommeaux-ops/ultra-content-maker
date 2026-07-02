import { existsSync, readFileSync } from "fs";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function resolveProjectId(): string {
  return (
    trimEnv(process.env.FIREBASE_PROJECT_ID) ||
    trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) ||
    trimEnv(process.env.GCLOUD_PROJECT) ||
    trimEnv(process.env.GOOGLE_CLOUD_PROJECT)
  );
}

function loadServiceAccountFromJson(jsonPath: string): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
  if (!existsSync(jsonPath) || !jsonPath.endsWith(".json")) return null;
  try {
    const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!raw.project_id || !raw.client_email || !raw.private_key) return null;
    return {
      projectId: raw.project_id,
      clientEmail: raw.client_email,
      privateKey: raw.private_key,
    };
  } catch {
    return null;
  }
}

function initAdminApp(): App | null {
  if (getApps().length) return getApps()[0]!;

  const jsonPath =
    trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) ||
    trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (jsonPath && jsonPath !== "adc") {
    const fromJson = loadServiceAccountFromJson(jsonPath);
    if (fromJson) {
      return initializeApp({
        credential: cert(fromJson),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  }

  const projectId = resolveProjectId();
  const clientEmail = trimEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = trimEnv(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  const useAdc =
    trimEnv(process.env.USE_GCLOUD_ADC) === "1" ||
    trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS) === "adc";

  if (useAdc && projectId) {
    return initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return null;
}

export function isFirebaseAdminConfigured(): boolean {
  if (getApps().length) return true;

  const jsonPath =
    trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) ||
    trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (jsonPath && jsonPath !== "adc") {
    if (loadServiceAccountFromJson(jsonPath)) return true;
  }

  const projectId = resolveProjectId();
  const clientEmail = trimEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = trimEnv(process.env.FIREBASE_PRIVATE_KEY);
  if (projectId && clientEmail && privateKey) return true;

  if (
    (trimEnv(process.env.USE_GCLOUD_ADC) === "1" ||
      trimEnv(process.env.GOOGLE_APPLICATION_CREDENTIALS) === "adc") &&
    projectId
  ) {
    return true;
  }

  return false;
}

export function getAdminApp(): App | null {
  return initAdminApp();
}
