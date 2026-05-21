import type { Auth, UserCredential } from "firebase/auth";
import { getRedirectResult } from "firebase/auth";

const PENDING_KEY = "ucm:google-redirect-pending";
const REDIRECT_TIMEOUT_MS = 12_000;

let redirectResultPromise: Promise<UserCredential | null> | null = null;

export function markGoogleRedirectPending(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(PENDING_KEY, "1");
  }
}

export function clearGoogleRedirectPending(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(PENDING_KEY);
  }
}

export function isGoogleRedirectPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(PENDING_KEY) === "1";
}

export function completeGoogleRedirect(auth: Auth): Promise<UserCredential | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = Promise.race([
      getRedirectResult(auth),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error("Google redirect timed out") as Error & { code: string };
          err.code = "app/google-redirect-timeout";
          reject(err);
        }, REDIRECT_TIMEOUT_MS);
      }),
    ]).finally(() => {
      redirectResultPromise = null;
    });
  }
  return redirectResultPromise;
}
