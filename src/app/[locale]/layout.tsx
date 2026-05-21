import { AuthProvider } from "@/components/auth/auth-provider";
import { getSiteUrl } from "@/lib/brand/site-url";
import { routing } from "@/i18n/routing";
import type { AppLocale } from "@/i18n/routing";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const siteDescription = "Ultra Content Maker: AI ghostwriter for LinkedIn";

export function generateMetadata(): Metadata {
  const ogImageUrl = `${getSiteUrl()}/og-image.png`;
  return {
    openGraph: {
      type: "website",
      siteName: "Ultra Content Maker",
      title: "ULTRA CONTENT MAKER",
      description: siteDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Ultra Content Maker: AI ghostwriter for LinkedIn",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "ULTRA CONTENT MAKER",
      description: siteDescription,
      images: [ogImageUrl],
    },
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const appLocale = locale as AppLocale;
  const messages = (await import(`../../../messages/${appLocale}.json`)).default;

  return (
    <NextIntlClientProvider locale={appLocale} messages={messages}>
      <AuthProvider>{children}</AuthProvider>
    </NextIntlClientProvider>
  );
}
