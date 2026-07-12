"use client";

import { getPersona } from "@/lib/workspace/persona";
import { Link } from "@/i18n/navigation";
import type { PersonaDoc } from "@/types/workspace";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  userId: string;
  refreshToken?: number;
};

function formatPersonaDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function PersonaSyncStatusBanner({
  userId,
  refreshToken = 0,
}: Props) {
  const t = useTranslations("setup.author.personaSync");
  const locale = useLocale();
  const [persona, setPersona] = useState<PersonaDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPersona(userId).then((p) => {
      if (!cancelled) setPersona(p);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  const hasPersona = Boolean(persona?.promptText?.trim());
  const lastChange = persona?.recentChanges?.find((c) => c.source === "profile_sync");

  return (
    <div
      className="rounded-xl border border-ns-primary/20 bg-ns-primary/5 px-4 py-3 text-sm leading-relaxed"
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-ns-tertiary">{t("inlineHint")}</p>
      {hasPersona && lastChange?.summary ? (
        <p className="mt-1.5 text-xs text-ns-secondary">{lastChange.summary}</p>
      ) : null}
      {hasPersona && persona?.updatedAt ? (
        <p className="mt-1 text-xs text-ns-secondary">
          {t("lastUpdated", {
            date: formatPersonaDate(persona.updatedAt, locale),
          })}
        </p>
      ) : !hasPersona ? (
        <p className="mt-1 text-xs text-ns-secondary">{t("noPersonaYet")}</p>
      ) : null}
      {hasPersona ? (
        <Link
          href="/persona"
          className="mt-2 inline-block text-xs font-medium text-ns-primary underline hover:text-ns-tertiary"
        >
          {t("viewPersona")}
        </Link>
      ) : null}
    </div>
  );
}
