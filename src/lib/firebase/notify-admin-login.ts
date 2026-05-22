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

/** Fire-and-forget admin e-mail; deduped per user per minute in this browser tab. */
export function notifyAdminLogin(userId: string, meta: AdminLoginNotifyMeta): void {
  if (typeof sessionStorage !== "undefined") {
    const key = dedupeKey(userId);
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (last && now - Number(last) < DEDUPE_MS) return;
    sessionStorage.setItem(key, String(now));
  }

  void (async () => {
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
      });
    } catch {
      /* notification must not block sign-in */
    }
  })();
}
