"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { redirectAfterSignInForUser } from "@/lib/firebase/auth-redirect";
import { resolveAuthErrorMessage } from "@/lib/firebase/auth-errors";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getClientAuth } from "@/lib/firebase/client";
import { clearGoogleRedirectPending } from "@/lib/firebase/google-redirect";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS, LABEL_CLASS } from "@/lib/ui/nextstep";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useLocale, useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";

export function SignupForm() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("auth.signup");
  const tLogin = useTranslations("auth.login");
  const tErr = useTranslations("auth.errors");
  const { user, redirectError, googleRedirectFinishing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectErrorMessage = redirectError
    ? resolveAuthErrorMessage(tErr, redirectError)
    : null;
  const error = formError ?? redirectErrorMessage;

  useEffect(() => {
    if (!user) return;
    void redirectAfterSignInForUser(
      locale,
      user.uid,
      user.email ?? "",
      user.displayName ?? undefined,
    );
  }, [user, locale]);

  if (googleRedirectFinishing) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-ns-border bg-ns-surface-muted px-4 py-3 text-sm text-ns-secondary">
          {tLogin("googleWait")}
        </p>
        <button
          type="button"
          className={`w-full ${BTN_SECONDARY}`}
          onClick={() => {
            clearGoogleRedirectPending();
            window.location.reload();
          }}
        >
          {tLogin("googleCancel")}
        </button>
      </div>
    );
  }

  if (user) {
    return (
      <p className="rounded-lg border border-ns-border bg-ns-surface-muted px-4 py-3 text-sm text-ns-secondary">
        {tLogin("redirecting")}
      </p>
    );
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {tErr("config")}
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      const auth = getClientAuth();
      if (!auth) {
        setFormError(tErr("unavailable"));
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await redirectAfterSignInForUser(
        locale,
        cred.user.uid,
        cred.user.email ?? email,
        cred.user.displayName ?? undefined,
        { method: "email", event: "signup" },
      );
    } catch (err) {
      setFormError(resolveAuthErrorMessage(tErr, err));
      setPending(false);
    }
  }

  async function onGoogle() {
    setFormError(null);
    setPending(true);
    const auth = getClientAuth();
    if (!auth) {
      setFormError(tErr("unavailable"));
      setPending(false);
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const cred = await signInWithPopup(auth, provider);
      await redirectAfterSignInForUser(
        locale,
        cred.user.uid,
        cred.user.email ?? "",
        cred.user.displayName ?? undefined,
        { method: "google", event: "signup" },
      );
    } catch (err) {
      setFormError(resolveAuthErrorMessage(tErr, err));
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={LABEL_CLASS} htmlFor="email">
            {tLogin("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="password">
            {tLogin("password")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className={`w-full ${BTN_PRIMARY}`}
        >
          {t("submit")}
        </button>
      </form>
      <button
        type="button"
        onClick={onGoogle}
        disabled={pending}
        className={`w-full ${BTN_SECONDARY}`}
      >
        {pending ? tLogin("googleRedirecting") : tLogin("google")}
      </button>
      <p className="text-center text-sm text-ns-secondary">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-bold text-ns-primary underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
