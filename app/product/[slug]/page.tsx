import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { shopProducts } from "@/constants/products";
import { getProductBySlug } from "@/lib/firestore/products";

export function generateStaticParams() {
  return shopProducts.map((product) => ({ slug: product.slug }));
}

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
          <ProductGallery product={product} />
          <ProductInfo product={product} />
        </section>
        <RelatedProducts />
      </main>
      <div className="club-footer-shell">
        <Footer />
      </div>
    </>
  );
}
