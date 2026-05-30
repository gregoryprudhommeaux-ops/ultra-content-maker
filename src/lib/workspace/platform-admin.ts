/** Platform admins can create and switch workspace accounts (client workspaces). */
const DEFAULT_PLATFORM_ADMIN_EMAILS = ["gregory.prudhommeaux@gmail.com"] as const;

function configuredAdminEmails(): readonly string[] {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAILS?.split(",")
      : undefined;
  const extra = (fromEnv ?? [])
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  if (extra.length === 0) return DEFAULT_PLATFORM_ADMIN_EMAILS;
  return [...new Set([...DEFAULT_PLATFORM_ADMIN_EMAILS, ...extra])];
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return configuredAdminEmails().includes(normalized);
}
