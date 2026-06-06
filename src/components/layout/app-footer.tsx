"use client";

import { Link } from "@/i18n/navigation";
import { NsAppFooter } from "@ns-suite/ui/components";
import { useTranslations } from "next-intl";

type AppFooterProps = {
  variant?: "dark" | "light";
  showAuthLinks?: boolean;
  showAppLinks?: boolean;
};

export function AppFooter({
  variant = "dark",
  showAuthLinks = false,
  showAppLinks = false,
}: AppFooterProps) {
  const t = useTranslations("app.footer");
  const year = new Date().getFullYear();

  return (
    <NsAppFooter
      Link={Link}
      variant={variant}
      showAuthLinks={showAuthLinks}
      showAppLinks={showAppLinks}
      labels={{
        tagline: t("tagline"),
        rights: t("rights", { year }),
        footerNavAria: "Footer",
        home: t("home"),
        library: t("library"),
        signup: t("signup"),
        login: t("login"),
      }}
    />
  );
}
