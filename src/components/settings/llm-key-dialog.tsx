"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Link, usePathname } from "@/i18n/navigation";
import { getUserLlmProfile } from "@/lib/workspace/llm-settings";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/ui/nextstep";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const LLM_SETUP_PATH = "/setup/llm";

export function LlmKeyDialog() {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("settings.llmKeyDialog");
  const [missingKey, setMissingKey] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);
  const onLlmSetupPage = pathname === LLM_SETUP_PATH;

  useEffect(() => {
    if (authLoading || !user) {
      setChecked(false);
      setMissingKey(false);
      return;
    }
    let cancelled = false;
    getUserLlmProfile(user.uid)
      .then((profile) => {
        if (cancelled) return;
        const needsKey = !profile?.apiKey?.trim();
        setMissingKey(needsKey);
        if (!needsKey) setDismissed(false);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, pathname]);

  const showDialog = checked && missingKey && !onLlmSetupPage && !dismissed;

  if (!showDialog) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="llm-key-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-ns-border bg-white p-6 shadow-xl">
        <h2
          id="llm-key-dialog-title"
          className="text-lg font-semibold text-ns-tertiary"
        >
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-ns-secondary">{t("body")}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => setDismissed(true)}
          >
            {t("dismiss")}
          </button>
          <Link href={LLM_SETUP_PATH} className={`text-center ${BTN_PRIMARY}`}>
            {t("updateKey")}
          </Link>
        </div>
      </div>
    </div>
  );
}
