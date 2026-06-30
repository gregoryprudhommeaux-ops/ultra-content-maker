import type { User } from "firebase/auth";

/** Firebase provider IDs for the current session (e.g. google.com, password). */
export function listSignInProviderIds(user: User): string[] {
  const fromProviders = user.providerData
    .map((p) => p.providerId)
    .filter((id): id is string => Boolean(id));
  if (fromProviders.length > 0) return [...new Set(fromProviders)];
  if (user.email) return ["password"];
  return [];
}
