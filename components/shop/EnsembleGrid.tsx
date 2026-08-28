import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { formatDzd } from "@/constants/products";
import { CLOUDINARY_IMAGE_WIDTHS, cloudinaryImageUrl } from "@/lib/cloudinary-delivery";
import { getLookHref } from "@/lib/look-urls";
import type { Look } from "@/types/look";

export function EnsembleGrid({ looks }: { looks: Look[] }) {
  if (!looks.length) {
    return <section className="shopProducts" aria-label="213 RUN ensembles"><div className="shopEmptyState"><strong>No ensembles available yet.</strong></div></section>;
  }

  return (
    <section className="shopProducts" aria-label="213 RUN ensembles">
      <div className="ensembleGrid">
        {looks.map((look) => {
          const image = look.figureImage ?? look.heroImage;
          return (
            <article className="ensembleCard" key={look.id}>
              <Link className="ensembleCard__image" href={getLookHref(look)} aria-label={`View ${look.name}`}>
                <Image src={cloudinaryImageUrl(image.url, { width: CLOUDINARY_IMAGE_WIDTHS.lookCard })} alt={image.alt || look.name} fill sizes="(max-width: 560px) 50vw, (max-width: 1000px) 33vw, 24vw" unoptimized />
              </Link>
              <FavoriteButton className="ensembleCard__favorite" itemType="look" itemId={look.id} itemName={look.name} />
              <div className="ensembleCard__content"><Link href={getLookHref(look)}>{look.name}</Link><strong>{formatDzd(look.priceDzd)}</strong></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
