const SIGNUP_PENDING_KEY = "ucm:signup-pending";

/** Set before Google redirect from the signup page. */
export function markSignupPending(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SIGNUP_PENDING_KEY, "1");
  }
}

export function clearSignupPending(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SIGNUP_PENDING_KEY);
  }
}

/** Returns true once if signup was initiated via Google redirect. */
export function consumeSignupPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const pending = sessionStorage.getItem(SIGNUP_PENDING_KEY) === "1";
  if (pending) sessionStorage.removeItem(SIGNUP_PENDING_KEY);
  return pending;
}
