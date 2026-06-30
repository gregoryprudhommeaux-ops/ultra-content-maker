import { getAdminAuth } from "@/lib/firebase/admin";

export async function verifyBearerUserId(
  authorizationHeader: string | null,
): Promise<string | null> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}
