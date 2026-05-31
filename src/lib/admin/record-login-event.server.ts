import { FieldValue, type Firestore } from "firebase-admin/firestore";

export type LoginEventPayload = {
  userId: string;
  email: string;
  displayName?: string;
  method: "email" | "google";
  event: "login" | "signup";
  locale?: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKeyFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function monthKeyFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

export function yearKeyFromDate(date: Date): string {
  return String(date.getUTCFullYear());
}

/** Persists login/signup for admin analytics (server-only writes). */
export async function recordLoginEvent(
  db: Firestore,
  payload: LoginEventPayload,
): Promise<void> {
  const now = new Date();
  const dateKey = dateKeyFromDate(now);
  const monthKey = monthKeyFromDate(now);
  const yearKey = yearKeyFromDate(now);
  const ts = FieldValue.serverTimestamp();

  const loginRef = db.collection("analytics").doc("logins").collection("events").doc();
  const dailyRef = db.doc(`analytics/daily/${dateKey}/users/${payload.userId}`);
  const monthlyRef = db.doc(`analytics/monthly/${monthKey}/users/${payload.userId}`);
  const yearlyRef = db.doc(`analytics/yearly/${yearKey}/users/${payload.userId}`);

  const batch = db.batch();

  batch.set(loginRef, {
    userId: payload.userId,
    email: payload.email,
    displayName: payload.displayName ?? null,
    method: payload.method,
    event: payload.event,
    locale: payload.locale ?? null,
    createdAt: ts,
  });

  const hitPayload = {
    email: payload.email,
    displayName: payload.displayName ?? null,
    lastAt: ts,
    hits: FieldValue.increment(1),
  };

  batch.set(dailyRef, hitPayload, { merge: true });
  batch.set(monthlyRef, hitPayload, { merge: true });
  batch.set(yearlyRef, hitPayload, { merge: true });

  batch.set(
    db.doc(`analytics/users/${payload.userId}`),
    {
      email: payload.email,
      displayName: payload.displayName ?? null,
      totalHits: FieldValue.increment(1),
      lastLoginAt: ts,
      lastEvent: payload.event,
    },
    { merge: true },
  );

  await batch.commit();
}
