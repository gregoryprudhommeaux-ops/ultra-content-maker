import type { FirebaseError } from "firebase/app";

type AuthErrorKey =
  | "invalidCredential"
  | "userNotFound"
  | "wrongPassword"
  | "invalidEmail"
  | "emailInUse"
  | "weakPassword"
  | "tooManyRequests"
  | "popupClosed"
  | "popupBlocked"
  | "providerDisabled"
  | "unauthorizedDomain"
  | "networkFailed"
  | "unavailable"
  | "googleRedirectTimeout"
  | "generic";

function extractAuthErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as FirebaseError).code);
  }
  if (error instanceof Error && error.message === "Auth unavailable") {
    return "app/auth-unavailable";
  }
  return "";
}

export function getFirebaseAuthErrorKey(error: unknown): AuthErrorKey {
  const code = extractAuthErrorCode(error);

  switch (code) {
    case "app/auth-unavailable":
      return "unavailable";
    case "app/google-redirect-timeout":
      return "googleRedirectTimeout";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "invalidCredential";
    case "auth/user-not-found":
      return "userNotFound";
    case "auth/wrong-password":
      return "wrongPassword";
    case "auth/invalid-email":
      return "invalidEmail";
    case "auth/email-already-in-use":
      return "emailInUse";
    case "auth/weak-password":
      return "weakPassword";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "popupClosed";
    case "auth/popup-blocked":
      return "popupBlocked";
    case "auth/operation-not-allowed":
      return "providerDisabled";
    case "auth/unauthorized-domain":
      return "unauthorizedDomain";
    case "auth/network-request-failed":
      return "networkFailed";
    default:
      return "generic";
  }
}

export function resolveAuthErrorMessage(
  tErr: (key: AuthErrorKey | "config" | "generic") => string,
  error: unknown,
): string {
  const key = getFirebaseAuthErrorKey(error);
  if (key !== "generic") return tErr(key);
  const code = extractAuthErrorCode(error);
  if (code) return `${tErr("generic")} (${code})`;
  return tErr("generic");
}
