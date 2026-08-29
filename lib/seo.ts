import type { Metadata } from "next";

export const SITE_NAME = "213 RUN";
export const SITE_ORIGIN = "https://run213.vercel.app";
export const SITE_URL = new URL(SITE_ORIGIN);
export const SITE_TITLE = "213 RUN | Streetwear for Everyday Movement";
export const SITE_DESCRIPTION = "Shop 213 RUN streetwear in Algeria: T-shirts, hoodies, pants, accessories and curated Looks designed for comfort, modern fits and everyday wear.";
export const DEFAULT_SOCIAL_IMAGE = "/media/hero/hero-poster.webp";

export const isProductionDeployment = process.env.VERCEL_ENV === "production";

export const privatePageMetadata: Metadata = {
  robots: { index: false, follow: false },
};

export function canonicalUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

type PublicMetadataInput = {
  title: string;
  description: string;
  pathname: string;
  image?: string | null;
};

export function publicPageMetadata({ title, description, pathname, image }: PublicMetadataInput): Metadata {
  const url = canonicalUrl(pathname);
  const images = [image || DEFAULT_SOCIAL_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
