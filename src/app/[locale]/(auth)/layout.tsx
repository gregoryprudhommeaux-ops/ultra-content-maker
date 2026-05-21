import { AuthProvider } from "@/components/auth/auth-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PAGE_DESC, PAGE_TITLE } from "@/lib/ui/nextstep";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("app");

  return (
    <AuthProvider>
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
        <h1 className={`${PAGE_TITLE} text-white md:text-4xl`}>{t("name")}</h1>
        <p className={`${PAGE_DESC} mt-3 max-w-md text-white/70`}>{t("tagline")}</p>
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ns-surface p-8 shadow-2xl">
        {children}
      </div>
    </div>
    </AuthProvider>
  );
}
