import type { Auth } from "firebase-admin/auth";
import {
  isPlatformAdminEmail,
  isPlatformAdminUid,
  PLATFORM_ADMIN_CLAIM,
} from "@/lib/workspace/platform-admin";

/** Sets Firebase Auth custom claim `platformAdmin: true` for allowlisted uid/email. */
export async function ensurePlatformAdminClaim(
  adminAuth: Auth,
  uid: string,
  email?: string | null,
): Promise<boolean> {
  if (!isPlatformAdminUid(uid) && !isPlatformAdminEmail(email)) {
    return false;
  }

  const user = await adminAuth.getUser(uid);
  const existing = (user.customClaims ?? {}) as Record<string, unknown>;
  if (existing[PLATFORM_ADMIN_CLAIM] === true) {
    return true;
  }

  await adminAuth.setCustomUserClaims(uid, {
    ...existing,
    [PLATFORM_ADMIN_CLAIM]: true,
  });
  return true;
}
