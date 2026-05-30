/** Platform admins can create and switch workspace accounts (client workspaces). */
const PLATFORM_ADMIN_EMAILS = ["gregory.prudhommeaux@gmail.com"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return (PLATFORM_ADMIN_EMAILS as readonly string[]).includes(normalized);
}
