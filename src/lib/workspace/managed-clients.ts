import { DEFAULT_ACCOUNT_ID } from "./workspace-scope";

export const MANAGED_ACCOUNT_PREFIX = "managed:";

export type ManagedClientRef = {
  clientUid: string;
  accountId: string;
  email: string;
  displayName?: string;
  linkedAt?: Date;
};

export function managedAccountId(
  clientUid: string,
  accountId: string = DEFAULT_ACCOUNT_ID,
): string {
  return `${MANAGED_ACCOUNT_PREFIX}${clientUid}:${accountId}`;
}

export function parseManagedAccountId(
  accountId: string,
): { clientUid: string; accountId: string } | null {
  if (!accountId.startsWith(MANAGED_ACCOUNT_PREFIX)) return null;
  const rest = accountId.slice(MANAGED_ACCOUNT_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon === -1) return { clientUid: rest, accountId: DEFAULT_ACCOUNT_ID };
  return {
    clientUid: rest.slice(0, colon),
    accountId: rest.slice(colon + 1) || DEFAULT_ACCOUNT_ID,
  };
}

export function isManagedAccountId(accountId: string): boolean {
  return accountId.startsWith(MANAGED_ACCOUNT_PREFIX);
}
