import {
  GoogleAuthProvider,
  type Auth,
  type UserCredential,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { markGoogleRedirectPending } from "./google-redirect";

function buildGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "127.0.0.1" || host === "localhost";
}

function isPopupBlockedError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "auth/popup-blocked";
}

/** Popup in production; redirect on localhost (popups often blocked on 127.0.0.1). */
export async function signInWithGoogle(
  auth: Auth,
): Promise<UserCredential | "redirect"> {
  const provider = buildGoogleProvider();

  if (isLocalDevHost()) {
    markGoogleRedirectPending();
    await signInWithRedirect(auth, provider);
    return "redirect";
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    if (isPopupBlockedError(err)) {
      markGoogleRedirectPending();
      await signInWithRedirect(auth, provider);
      return "redirect";
    }
    throw err;
  }
}
