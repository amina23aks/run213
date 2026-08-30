import type { Metadata } from "next";
import { CartProvider } from "@/context/cart";
import { FavoritesProvider } from "@/context/favorites";
import "./globals.css";
import { DEFAULT_SOCIAL_IMAGE, isProductionDeployment, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { AnalyticsConsentBanner } from "@/components/analytics/AnalyticsConsent";
import { Suspense } from "react";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: SITE_TITLE, template: "%s | 213 RUN" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  robots: isProductionDeployment ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/", images: [DEFAULT_SOCIAL_IMAGE] },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [DEFAULT_SOCIAL_IMAGE] },
  icons: { icon: "/brand/favicon.png", shortcut: "/brand/favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><CartProvider><FavoritesProvider>{children}<Suspense fallback={null}><AnalyticsProvider /></Suspense><AnalyticsConsentBanner /></FavoritesProvider></CartProvider></body>
    </html>
  );
}
