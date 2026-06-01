"use client";

import { routing, type AppLocale } from "@/i18n/routing";
import { NsLanguageSwitcher } from "@ns-suite/ui/components";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "EN",
  fr: "FR",
  es: "ES",
};

type Props = {
  variant?: "light" | "dark";
};

export function LanguageSwitcher({ variant = "light" }: Props) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: AppLocale) {
    const segments = pathname.split("/");
    if (routing.locales.includes(segments[1] as AppLocale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <NsLanguageSwitcher
      variant={variant}
      locales={routing.locales}
      activeLocale={locale}
      localeLabels={LOCALE_LABELS}
      onLocaleChange={(loc) => switchLocale(loc as AppLocale)}
    />
  );
}
