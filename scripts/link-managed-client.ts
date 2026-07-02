/**
 * One-off: link an existing client account to the platform admin dashboard.
 *
 * Usage:
 *   npx tsx scripts/link-managed-client.ts ana.ramos.cn@gmail.com
 */
import { linkManagedClientByEmail } from "../src/lib/admin/managed-clients.server";
import { getAdminAuth, getAdminFirestore } from "../src/lib/firebase/admin";
import { PRIMARY_PLATFORM_ADMIN_UID } from "../src/lib/workspace/platform-admin";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/link-managed-client.ts <client-email>");
    process.exit(1);
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  if (!db || !auth) {
    console.error("Firebase Admin is not configured (.env.local).");
    process.exit(1);
  }

  const entry = await linkManagedClientByEmail(db, auth, PRIMARY_PLATFORM_ADMIN_UID, email);
  console.log("Linked client:", entry);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
