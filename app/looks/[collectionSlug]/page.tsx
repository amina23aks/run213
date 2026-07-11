import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { formatDzd } from "@/constants/products";
import { getActiveLookCollectionBySlug, listActiveLooksByCollection } from "@/lib/firestore/looks";

export const dynamic = "force-dynamic";

type LooksCollectionPageProps = { params: Promise<{ collectionSlug: string }> };

export default async function LooksCollectionPage({ params }: LooksCollectionPageProps) {
  const { collectionSlug } = await params;
  const [collection, looks] = await Promise.all([
    getActiveLookCollectionBySlug(collectionSlug),
    listActiveLooksByCollection(collectionSlug),
  ]);

  if (!collection) notFound();

  return (
    <>
      <Header />
      <main className="looksCollectionPage">
        <section className="looksCollectionHero">
          <Image src={collection.cardImage.url} alt={collection.cardImage.alt} width={1280} height={620} unoptimized />
          <div>
            <span>LOOK COLLECTION</span>
            <h1>{collection.name}</h1>
            <p>{collection.description || collection.subtitle}</p>
          </div>
        </section>
        <section className="looksCollectionGrid" aria-label={`${collection.name} looks`}>
          {looks.length ? looks.map((look) => {
            const activeProducts = look.products.flatMap((entry) => entry.product ? [entry.product] : []);
            const total = activeProducts.reduce((sum, product) => sum + product.priceDzd, 0);
            return (
              <Link className="lookSummaryCard" href={`/look/${look.slug}`} key={look.id}>
                <Image src={look.heroImage.url} alt={look.heroImage.alt} width={720} height={860} unoptimized />
                <div>
                  <span>{look.numberLabel ?? "LOOK"}</span>
                  <h2>{look.name}</h2>
                  <p>{look.description}</p>
                  <div className="lookProductThumbs">{activeProducts.slice(0, 4).map((product) => <Image src={product.images[0]?.url ?? "/placeholders/product-placeholder.webp"} alt={product.name} width={54} height={64} key={product.id} unoptimized />)}</div>
                  {total ? <strong>{formatDzd(total)}</strong> : null}
                  <em>View look →</em>
                </div>
              </Link>
            );
          }) : <div className="shopLookEmpty"><strong>No active looks yet.</strong><span>This collection is ready for future looks.</span></div>}
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
