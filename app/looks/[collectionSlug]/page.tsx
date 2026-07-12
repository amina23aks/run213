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
  const collection = await getActiveLookCollectionBySlug(collectionSlug);

  if (!collection) notFound();

  const looks = await listActiveLooksByCollection(collection);

  return (
    <>
      <Header />
      <main className="looksCollectionPage">
        <section className="collectionHeader">
          <span>LOOK COLLECTION</span>
          <h1>{collection.name}</h1>
          <p>{collection.description || collection.subtitle}</p>
        </section>
        <section className="looksEditorialList" aria-label={`${collection.name} looks`}>
          {looks.length ? looks.map((look, index) => {
            const activeProducts = look.products.flatMap((entry) => entry.product ? [entry.product] : []);
            return (
              <article className="lookEditorialModule" key={look.id}>
                <Link className="lookEditorialImage" href={`/look/${look.slug}`} aria-label={`View ${look.name}`}>
                  <Image src={look.heroImage.url} alt={look.heroImage.alt} fill sizes="(max-width: 900px) 100vw, 52vw" unoptimized />
                </Link>
                <div className="lookEditorialContent">
                  <div className="lookEditorialTopline"><span>{look.numberLabel ?? `LOOK ${String(index + 1).padStart(2, "0")}`}</span><div><Link href={index > 0 ? `/look/${looks[index - 1]?.slug}` : `/look/${look.slug}`}>←</Link><Link href={index < looks.length - 1 ? `/look/${looks[index + 1]?.slug}` : `/look/${look.slug}`}>→</Link></div></div>
                  <h2>{look.name}</h2>
                  <p>{look.description}</p>
                  <div className="lookMiniProducts">
                    {activeProducts.slice(0, 4).map((product) => {
                      const image = product.images[0];
                      return <Link className="lookMiniProduct" href={`/product/${product.slug}`} key={product.id}><span className="lookMiniProduct__image">{image?.url ? <Image src={image.url} alt={image.alt || product.name} width={170} height={150} unoptimized /> : <span className="lookMiniProduct__fallback">No image</span>}</span><strong>{product.name}</strong><span>{product.colors[0]?.name ?? "Color"}</span><em>{formatDzd(product.priceDzd)}</em></Link>;
                    })}
                  </div>
                  <Link className="lookViewButton" href={`/look/${look.slug}`}>VIEW LOOK <span>→</span></Link>
                </div>
              </article>
            );
          }) : <p className="looksSmallEmpty">This collection is being built.</p>}
        </section>
      </main>
      <div className="club-footer-shell"><Footer /></div>
    </>
  );
}
