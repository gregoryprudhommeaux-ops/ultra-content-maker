/** Firebase Auth custom claim set via Admin SDK (see scripts/set-platform-admin-claim.ts). */
export const PLATFORM_ADMIN_CLAIM = "platformAdmin" as const;

/** Primary admin UID (Gregory · Google login in Firebase Console). */
const DEFAULT_PLATFORM_ADMIN_UIDS = ["uAmcN4TaGRb6tnJ6LS9c6wdCDCz1"] as const;

export const PRIMARY_PLATFORM_ADMIN_UID = DEFAULT_PLATFORM_ADMIN_UIDS[0];

const DEFAULT_PLATFORM_ADMIN_EMAILS = ["gregory.prudhommeaux@gmail.com"] as const;

export function normalizeEmail(email: string): string {
 return email.trim().toLowerCase();
}

function parseIdList(raw: string | undefined): string[] {
 return (raw ?? "")
 .split(",")
 .map((v) => v.trim())
 .filter(Boolean);
}

function configuredAdminUids(): readonly string[] {
 const fromEnv =
 typeof process !== "undefined"
 ? parseIdList(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_UIDS)
 : [];
 const fromServer =
 typeof process !== "undefined"
 ? parseIdList(process.env.PLATFORM_ADMIN_UIDS)
 : [];
 const merged = [...DEFAULT_PLATFORM_ADMIN_UIDS, ...fromEnv, ...fromServer];
 if (merged.length === 0) return DEFAULT_PLATFORM_ADMIN_UIDS;
 return [...new Set(merged)];
}

function configuredAdminEmails(): readonly string[] {
 const fromEnv =
 typeof process !== "undefined"
 ? parseIdList(process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS).map(normalizeEmail)
 : [];
 const extra = fromEnv.filter(Boolean);
 if (extra.length === 0) return DEFAULT_PLATFORM_ADMIN_EMAILS;
 return [...new Set([...DEFAULT_PLATFORM_ADMIN_EMAILS, ...extra])];
}

export function isPlatformAdminUid(uid: string | null | undefined): boolean {
 if (!uid) return false;
 return configuredAdminUids().includes(uid.trim());
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
 if (!email) return false;
 const normalized = normalizeEmail(email);
 return configuredAdminEmails().includes(normalized);
}

export function hasPlatformAdminClaim(
 claims: Record<string, unknown> | undefined,
): boolean {
 return claims?.[PLATFORM_ADMIN_CLAIM] === true;
}

export function isPlatformAdminIdentity(input: {
 uid?: string | null;
 email?: string | null;
 claims?: Record<string, unknown>;
}): boolean {
 if (hasPlatformAdminClaim(input.claims)) return true;
 if (isPlatformAdminUid(input.uid)) return true;
 if (isPlatformAdminEmail(input.email)) return true;
 return false;
}
