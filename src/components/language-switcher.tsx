"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const labels: Record<AppLocale, string> = {
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

  const shell =
    variant === "dark"
      ? "rounded-sm border border-white/20 bg-ns-hero p-0.5"
      : "rounded-sm border border-ns-alternate bg-ns-surface p-0.5";

  const active =
    variant === "dark"
      ? "bg-ns-primary text-black"
      : "bg-ns-primary text-black";
  const idle =
    variant === "dark"
      ? "text-white/70 hover:text-ns-primary"
      : "text-ns-secondary hover:bg-ns-brand-light";

  return (
    <div className={`flex gap-0.5 text-[10px] font-black uppercase tracking-widest ${shell}`}>
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={`rounded-sm px-2 py-1 transition-colors ${
            locale === loc ? active : idle
          }`}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
