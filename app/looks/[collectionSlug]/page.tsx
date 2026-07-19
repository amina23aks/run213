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
        <header className="lookCollectionHero">
          <Image
            className="lookCollectionHero__image"
            src={collection.cardImage.url}
            alt={collection.cardImage.alt || collection.name}
            fill
            sizes="100vw"
            style={{ objectPosition: collection.imagePosition ?? "center" }}
            priority
            unoptimized
          />
          <div className="lookCollectionHero__overlay">
            <h1>{collection.name}</h1>
            <p>{collection.subtitle}</p>
          </div>
        </header>
        <section className="looksEditorialList" aria-label={`${collection.name} looks`}>
          {looks.length ? looks.map((look, index) => {
            const activeProducts = look.products.flatMap((entry) => entry.product ? [entry.product] : []);
            return (
              <article className="lookEditorialModule" key={look.id}>
                <Link className="lookEditorialImage" href={`/look/${look.slug}`} aria-label={`View ${look.name}`}>
                  <Image src={look.heroImage.url} alt={look.heroImage.alt} fill sizes="(max-width: 900px) 100vw, 52vw" unoptimized />
                </Link>
                <div className="lookEditorialContent">
                  <div className="lookEditorialTopline"><span>{look.numberLabel ?? `LOOK ${String(index + 1).padStart(2, "0")}`}</span></div>
                  <h2>{look.name}</h2>
                  <p>{look.description}</p><div className="lookPromoPrice">{look.isPromo && look.compareAtPriceDzd && look.compareAtPriceDzd > look.priceDzd ? <><span className="discountBadge">PROMO</span><strong>{formatDzd(look.priceDzd)}</strong><del>{formatDzd(look.compareAtPriceDzd)}</del><em>-{look.discountPercent ?? Math.round(((look.compareAtPriceDzd - look.priceDzd) / look.compareAtPriceDzd) * 100)}%</em></> : <strong className="lookEditorialPrice">{formatDzd(look.priceDzd)}</strong>}</div>
                  <div className="lookMiniProducts">
                    {activeProducts.slice(0, 4).map((product) => {
                      const image = product.images[0];
                      return <Link className="lookMiniProduct" href={`/product/${product.slug}`} key={product.id}><span className="lookMiniProduct__image">{image?.url ? <Image src={image.url} alt={image.alt || product.name} width={150} height={130} unoptimized /> : <span className="lookMiniProduct__fallback">No image</span>}</span><strong>{product.name}</strong><span>{product.colors[0]?.name ?? "No color"}</span><small>{product.sizes.length ? product.sizes.map((size) => size.label).join(" · ") : "One size"}</small><em>{formatDzd(product.priceDzd)}</em></Link>;
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
