"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getClientAuth } from "@/lib/firebase/client";
import { storeActiveAccountId } from "@/lib/workspace/accounts";
import { setActiveWorkspaceScope } from "@/lib/workspace/workspace-scope";
import { BTN_PRIMARY, BTN_SECONDARY, PAGE_DESC, PAGE_TITLE } from "@/lib/ui/nextstep";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type InvitePreview = {
  accountName: string;
  expiresAt: string;
  status: "active" | "expired" | "used";
};

type Props = { token: string };

export function InviteOnboardingClient({ token }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("invite");
  const tApp = useTranslations("app");
  const { user, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        if (!res.ok) {
          setLoadError(t("errors.notFound"));
          return;
        }
        const data = (await res.json()) as InvitePreview;
        setPreview(data);
      } catch {
        setLoadError(t("errors.loadFailed"));
      }
    })();
  }, [token, t]);

  useEffect(() => {
    if (authLoading || !user || !preview || preview.status !== "active" || claimError) return;
    void claimInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- claim once when session + invite are ready
  }, [authLoading, user?.uid, preview?.status]);

  async function claimInvite() {
    if (!user || claiming) return;
    setClaiming(true);
    setClaimError(null);
    try {
      const auth = getClientAuth();
      const idToken = await auth?.currentUser?.getIdToken();
      if (!idToken) throw new Error("auth");

      const res = await fetch("/api/invites/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (data.error === "invite_expired") setClaimError(t("errors.expired"));
        else if (data.error === "invite_already_used") setClaimError(t("errors.used"));
        else setClaimError(t("errors.claimFailed"));
        return;
      }

      const data = (await res.json()) as {
        linkedWorkspace: { ownerId: string; accountId: string };
      };
      setActiveWorkspaceScope(data.linkedWorkspace);
      storeActiveAccountId(data.linkedWorkspace.ownerId, data.linkedWorkspace.accountId);
      window.location.assign(`/${locale}/setup/author`);
    } catch {
      setClaimError(t("errors.claimFailed"));
    } finally {
      setClaiming(false);
    }
  }

  const inviteQuery = `invite=${encodeURIComponent(token)}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-ns-hero px-4 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-ns-primary blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-ns-secondary blur-[120px]" />
      </div>
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher variant="dark" />
      </div>
      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-ns-primary font-black text-lg text-black">
          NS
        </div>
        <h1 className={`${PAGE_TITLE} text-white md:text-4xl`}>{tApp("name")}</h1>
        <p className={`${PAGE_DESC} mt-3 max-w-md text-white/70`}>{t("subtitle")}</p>
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ns-surface p-8 shadow-2xl">
        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : !preview ? (
          <p className="text-sm text-ns-secondary">{t("loading")}</p>
        ) : preview.status === "expired" ? (
          <p className="text-sm text-red-600">{t("errors.expired")}</p>
        ) : preview.status === "used" && !user ? (
          <p className="text-sm text-ns-secondary">{t("errors.used")}</p>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-ns-tertiary">{t("title")}</h2>
            <p className="text-sm text-ns-secondary">
              {t("forAccount", { name: preview.accountName })}
            </p>
            <p className="text-sm text-ns-secondary">{t("body")}</p>

            {claimError && <p className="text-sm text-red-600">{claimError}</p>}

            {user ? (
              <p className="text-sm text-ns-secondary">
                {claiming ? t("claiming") : t("redirecting")}
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-2">
                <Link
                  href={`/signup?${inviteQuery}`}
                  className={`${BTN_PRIMARY} text-center`}
                >
                  {t("signup")}
                </Link>
                <Link
                  href={`/login?${inviteQuery}`}
                  className={`${BTN_SECONDARY} text-center`}
                >
                  {t("login")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
