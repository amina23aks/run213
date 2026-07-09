import type { Metadata } from "next";
import { resolveLocale } from "@/i18n/config";
import { buildAlternateLanguages, buildLocalizedUrl, defaultOgImageUrl, privateRobots } from "@/lib/seo";

import { AdminOverviewStats } from "./components/AdminOverviewStats";

const metadataContent = {
  title: "Admin | Fish Your Style",
  description: "Manage orders and products for Fish Your Style.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = resolveLocale(localeParam);
  const url = buildLocalizedUrl(locale, "/admin");
  const ogImages = [defaultOgImageUrl];

  return {
    ...metadataContent,
    robots: privateRobots,
    alternates: {
      canonical: url,
      languages: buildAlternateLanguages("/admin"),
    },
    openGraph: {
      ...metadataContent,
      url,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      ...metadataContent,
      images: ogImages,
    },
  };
}

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Overview</p>
        <h1 className="text-3xl font-semibold text-white">Admin Overview</h1>
        <p className="max-w-2xl text-sky-100/90">
          Welcome to the control center. These cards will soon display live stats about orders,
          revenue, and visitor trends so you can keep Fish Your Style running smoothly.
        </p>
      </div>

      <AdminOverviewStats />

    </div>
  );
}
