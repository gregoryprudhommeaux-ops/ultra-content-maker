"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

/**
 * Defers Firebase Auth until after mount so public pages can paint immediately.
 */
export function useLazyAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void (async () => {
      const [{ getClientAuth }, { onAuthStateChanged }] = await Promise.all([
        import("@/lib/firebase/client"),
        import("firebase/auth"),
      ]);
      const auth = getClientAuth();
      if (!auth) {
        setReady(true);
        return;
      }
      unsub = onAuthStateChanged(auth, (next) => {
        setUser(next);
        setReady(true);
      });
    })();
    return () => unsub?.();
  }, []);

  return { user, ready };
}
