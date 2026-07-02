"use client";

import {
  completeGoogleRedirect,
  clearGoogleRedirectPending,
  isGoogleRedirectPending,
} from "@/lib/firebase/google-redirect";
import { clearLoginNotifyDedupe } from "@/lib/firebase/notify-admin-login";
import { getClientAuth } from "@/lib/firebase/client";
import {
  User,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  googleRedirectFinishing: boolean;
  redirectError: unknown;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleRedirectFinishing, setGoogleRedirectFinishing] = useState(() =>
    typeof window !== "undefined" ? isGoogleRedirectPending() : false,
  );
  const [redirectError, setRedirectError] = useState<unknown>(null);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      setGoogleRedirectFinishing(false);
      return;
    }

    let disposed = false;

    void setPersistence(auth, browserLocalPersistence).catch(() => {});

    void completeGoogleRedirect(auth)
      .then((cred) => {
        if (disposed) return;
        if (cred?.user) {
          setUser(cred.user);
          clearGoogleRedirectPending();
          setGoogleRedirectFinishing(false);
          return;
        }
        if (isGoogleRedirectPending()) {
          clearGoogleRedirectPending();
          setGoogleRedirectFinishing(false);
          if (!auth.currentUser) {
            const err = new Error("Google redirect returned no user") as Error & {
              code: string;
            };
            err.code = "auth/redirect-failed";
            setRedirectError(err);
          }
          return;
        }
        setGoogleRedirectFinishing(false);
      })
      .catch((err) => {
        if (disposed) return;
        clearGoogleRedirectPending();
        setGoogleRedirectFinishing(false);
        setRedirectError(err);
      });

    const unsub = onAuthStateChanged(auth, (next) => {
      if (disposed) return;
      setUser(next);
      setLoading(false);
      if (next) {
        clearGoogleRedirectPending();
        setGoogleRedirectFinishing(false);
      }
    });

    return () => {
      disposed = true;
      unsub();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      googleRedirectFinishing,
      redirectError,
      signOut: async () => {
        const auth = getClientAuth();
        if (user) clearLoginNotifyDedupe(user.uid);
        if (auth) await firebaseSignOut(auth);
      },
    }),
    [user, loading, googleRedirectFinishing, redirectError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
