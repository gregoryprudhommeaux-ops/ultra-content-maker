export function formatDisplayNameFromEmail(email: string): string | null {
  const local = email.split("@")[0]?.trim();
  if (!local) return null;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
