import { getClientAuth } from "@/lib/firebase/client";

const DEDUPE_MS = 60_000;

export type AdminLoginNotifyMeta = {
  method: "email" | "google";
  event: "login" | "signup";
  locale?: string;
};

function dedupeKey(userId: string): string {
  return `ucm:login-notify:${userId}`;
}

export function clearLoginNotifyDedupe(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(dedupeKey(userId));
}

function shouldDedupe(userId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const key = dedupeKey(userId);
  const last = sessionStorage.getItem(key);
  const now = Date.now();
  if (last && now - Number(last) < DEDUPE_MS) return true;
  sessionStorage.setItem(key, String(now));
  return false;
}

/** Notify admin of login/signup. Await before full-page redirect so the request is not aborted. */
export async function notifyAdminLogin(
  userId: string,
  meta: AdminLoginNotifyMeta,
): Promise<void> {
  if (shouldDedupe(userId)) return;

  try {
    const auth = getClientAuth();
    const token = await auth?.currentUser?.getIdToken();
    if (!token) return;

    await fetch("/api/auth/login-notification", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(meta),
      keepalive: true,
    });
  } catch {
    /* notification must not block sign-in */
  }
}
