import type { AppLocale } from "@/i18n/routing";

/** Locale-aware USD display · US$ prefix (EN/ES) avoids confusion with MXN in Spanish. */
export function formatUsdAmount(amount: number, locale: AppLocale): string {
 if (locale === "fr") {
 return `${amount} USD`;
 }
 return `US$${amount}`;
}
