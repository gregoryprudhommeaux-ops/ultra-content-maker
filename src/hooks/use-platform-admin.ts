"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { useWorkspace } from "@/contexts/workspace-context";
import { isUserPlatformAdmin } from "@/lib/workspace/resolve-user-email";

/** Admin flag from login email (immediate) + workspace bootstrap (Firestore flag). */
export function usePlatformAdmin(): boolean {
  const { user } = useAuth();
  const { isPlatformAdmin: fromWorkspace } = useWorkspace();
  return isUserPlatformAdmin(user) || fromWorkspace;
}
