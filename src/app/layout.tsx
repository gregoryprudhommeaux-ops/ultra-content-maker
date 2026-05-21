import { getSiteUrl } from "@/lib/brand/site-url";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = getSiteUrl();
const ogImageUrl = `${siteUrl}/og-image.png`;

const siteDescription =
  "Ultra Content Maker : Ghostwriter IA pour LinkedIn — un outil NS Suite pour les entrepreneurs.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ULTRA CONTENT MAKER",
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
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
        alt: "Ultra Content Maker — NS Suite",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ns-background font-sans text-ns-tertiary">
        {children}
      </body>
    </html>
  );
}
