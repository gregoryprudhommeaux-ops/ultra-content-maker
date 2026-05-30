import type { User } from "firebase/auth";
import { isPlatformAdminEmail, normalizeEmail } from "./platform-admin";

/** Firebase Google sign-in sometimes omits user.email briefly; fall back to providerData. */
export function resolveUserEmail(user: User | null | undefined): string | null {
  if (!user) return null;
  const direct = user.email?.trim();
  if (direct) return normalizeEmail(direct);
  for (const provider of user.providerData) {
    const email = provider.email?.trim();
    if (email) return normalizeEmail(email);
  }
  return null;
}

export function isUserPlatformAdmin(user: User | null | undefined): boolean {
  return isPlatformAdminEmail(resolveUserEmail(user));
}
