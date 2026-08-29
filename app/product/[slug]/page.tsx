import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { getProductBySlug, listActiveProducts, SHOP_CATALOG_LIMIT } from "@/lib/firestore/products";
import { rankRelatedProducts } from "@/lib/products/related";
import type { Metadata } from "next";
import { cache } from "react";
import { canonicalUrl, publicPageMetadata, safeJsonLd, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

const getPublicProduct = cache(getProductBySlug);

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) return {};
  return publicPageMetadata({ title: product.name, description: product.description, pathname: `/product/${product.slug}`, image: product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);

  if (!product) notFound();

  const canonical = canonicalUrl(`/product/${product.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((image) => image.url),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "DZD",
      price: product.priceDzd,
      availability: `https://schema.org/${product.inStock ? "InStock" : "OutOfStock"}`,
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <Header />
      <main className="productPage">
        <section className="productDetail" aria-label={`${product.name} product detail`}>
          <ProductDetailClient product={product} />
        </section>
        <RelatedProducts products={rankRelatedProducts(product, await listActiveProducts(SHOP_CATALOG_LIMIT))} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
