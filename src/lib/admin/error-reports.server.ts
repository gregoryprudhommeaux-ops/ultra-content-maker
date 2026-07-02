import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import type { ErrorReportPayload } from "@/lib/email/send-error-report";

export type ErrorReportStatus = "open" | "resolved";

export type ErrorReportRow = ErrorReportPayload & {
  id: string;
  status: ErrorReportStatus;
  createdAt: string | null;
};

function itemsCollection(db: Firestore) {
  return db.collection("platform").doc("errorReports").collection("items");
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

export async function persistErrorReport(
  db: Firestore,
  payload: ErrorReportPayload,
): Promise<string> {
  const ref = itemsCollection(db).doc();
  await ref.set({
    ...payload,
    status: "open" satisfies ErrorReportStatus,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function listErrorReports(
  db: Firestore,
  limit = 40,
): Promise<ErrorReportRow[]> {
  const snap = await itemsCollection(db)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: String(data.userId ?? ""),
      userEmail: String(data.userEmail ?? ""),
      displayName: data.displayName ? String(data.displayName) : undefined,
      surface: String(data.surface ?? ""),
      userMessage: String(data.userMessage ?? ""),
      errorCode: data.errorCode ? String(data.errorCode) : undefined,
      detail: data.detail ? String(data.detail) : undefined,
      userNote: data.userNote ? String(data.userNote) : undefined,
      locale: data.locale ? String(data.locale) : undefined,
      pageUrl: data.pageUrl ? String(data.pageUrl) : undefined,
      userAgent: data.userAgent ? String(data.userAgent) : undefined,
      status: (data.status === "resolved" ? "resolved" : "open") as ErrorReportStatus,
      createdAt: toIsoDate(data.createdAt),
    };
  });
}

export async function setErrorReportStatus(
  db: Firestore,
  reportId: string,
  status: ErrorReportStatus,
): Promise<boolean> {
  const ref = itemsCollection(db).doc(reportId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.update({ status });
  return true;
}
