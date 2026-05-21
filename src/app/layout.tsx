import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://ultra-content-maker.vercel.app");

const siteDescription =
  "Ultra Content Maker : Ghostwriter IA pour LinkedIn — un outil NS Suite pour les entrepreneurs.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ULTRA CONTENT MAKER",
  description: siteDescription,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Ultra Content Maker",
    title: "ULTRA CONTENT MAKER",
    description: siteDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ultra Content Maker" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ULTRA CONTENT MAKER",
    description: siteDescription,
    images: ["/opengraph-image"],
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
