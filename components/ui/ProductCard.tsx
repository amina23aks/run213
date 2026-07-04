import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ArrowButton } from "@/components/ui/ArrowButton";

type ProductCardProps = {
  name: string;
  price: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  colors?: string[];
  sizes?: string[];
  badge?: string;
};

export function ProductCard({
  name,
  price,
  href,
  imageSrc,
  imageAlt,
  colors = [],
  sizes = [],
  badge,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <Link href={href} className="product-card-media" aria-label={name}>
        {badge ? <span className="product-card-badge">{badge}</span> : null}
        <Image src={imageSrc} alt={imageAlt} fill sizes="(min-width: 1024px) 25vw, 50vw" />
      </Link>
      <button type="button" className="product-card-heart" aria-label={`Save ${name}`}>
        <Heart aria-hidden="true" size={18} />
      </button>
      <div className="product-card-body">
        <div>
          <h3>{name}</h3>
          <p>{price}</p>
        </div>
        <ArrowButton href={href} label="View" aria-label={`View ${name}`} />
      </div>
      {(colors.length > 0 || sizes.length > 0) && (
        <div className="product-card-options" aria-label={`${name} options`}>
          {colors.length > 0 ? (
            <div className="product-card-colors">
              {colors.map((color) => (
                <span key={color} style={{ backgroundColor: color }} aria-label={color} />
              ))}
            </div>
          ) : null}
          {sizes.length > 0 ? (
            <div className="product-card-sizes">
              {sizes.map((size) => (
                <span key={size}>{size}</span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
