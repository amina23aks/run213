import type { MetadataRoute } from "next";
import { isProductionDeployment, SITE_ORIGIN } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment) {
    return { rules: { userAgent: "*", disallow: "/" }, sitemap: `${SITE_ORIGIN}/sitemap.xml` };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
