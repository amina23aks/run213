import type { MetadataRoute } from "next";
import { listActiveLookCollections, listActiveLooks } from "@/lib/firestore/looks";
import { listActiveProducts, SHOP_CATALOG_LIMIT } from "@/lib/firestore/products";
import { canonicalUrl } from "@/lib/seo";

const SEO_LOOK_LIMIT = 60;
const SEO_COLLECTION_LIMIT = 60;

function validDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, looks, collections] = await Promise.all([
    listActiveProducts(SHOP_CATALOG_LIMIT),
    listActiveLooks(SEO_LOOK_LIMIT),
    listActiveLookCollections(SEO_COLLECTION_LIMIT),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: canonicalUrl("/shop"), changeFrequency: "weekly", priority: 0.9 },
    { url: canonicalUrl("/run-club"), changeFrequency: "weekly", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({ url: canonicalUrl(`/product/${product.slug}`), lastModified: validDate(product.updatedAt), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...looks.map((look) => ({ url: canonicalUrl(`/look/${look.slug}`), lastModified: validDate(look.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...collections.map((collection) => ({ url: canonicalUrl(`/looks/${collection.slug}`), lastModified: validDate(collection.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
