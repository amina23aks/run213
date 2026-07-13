import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { getProductBySlug, listActiveProducts } from "@/lib/firestore/products";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="productPage">
        <section className="productDetail" aria-label={`${product.name} product detail`}>
          <ProductDetailClient product={product} />
        </section>
        <RelatedProducts products={(await listActiveProducts(4)).filter((relatedProduct) => relatedProduct.slug !== product.slug)} />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
