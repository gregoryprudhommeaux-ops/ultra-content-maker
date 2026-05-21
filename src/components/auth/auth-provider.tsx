"use client";

import {
  completeGoogleRedirect,
  clearGoogleRedirectPending,
  isGoogleRedirectPending,
} from "@/lib/firebase/google-redirect";
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
  const [googleRedirectFinishing, setGoogleRedirectFinishing] = useState(false);
  const [redirectError, setRedirectError] = useState<unknown>(null);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    void setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
      if (next) clearGoogleRedirectPending();
    });

    if (isGoogleRedirectPending()) {
      void completeGoogleRedirect(auth).catch((err) => {
        clearGoogleRedirectPending();
        setRedirectError(err);
      });
    }

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!loading) {
      setGoogleRedirectFinishing(false);
      if (!user && isGoogleRedirectPending()) clearGoogleRedirectPending();
      return;
    }
    setGoogleRedirectFinishing(isGoogleRedirectPending());
  }, [loading, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      googleRedirectFinishing,
      redirectError,
      signOut: async () => {
        const auth = getClientAuth();
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
