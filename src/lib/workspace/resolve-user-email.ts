import type { User } from "firebase/auth";
import { isPlatformAdminIdentity } from "./platform-admin";

/** Firebase Google sign-in sometimes omits user.email briefly; fall back to providerData. */
export function resolveUserEmail(user: User | null | undefined): string | null {
  if (!user) return null;
  const direct = user.email?.trim();
  if (direct) return direct.toLowerCase();
  for (const provider of user.providerData) {
    const email = provider.email?.trim();
    if (email) return email.toLowerCase();
  }
  return null;
}

export function isUserPlatformAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return isPlatformAdminIdentity({
    uid: user.uid,
    email: resolveUserEmail(user),
  });
}
