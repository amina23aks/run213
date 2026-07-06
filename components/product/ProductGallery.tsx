import Image from "next/image";
import type { StaticProduct } from "@/constants/products";

type ProductGalleryProps = {
  product: StaticProduct;
};

const galleryImages = ["/tshirt.png", "/top.png", "/model.png"];

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = [product.image, ...galleryImages.filter((image) => image !== product.image)].slice(0, 3);

  return (
    <section className="productGallery" aria-label={`${product.name} gallery`}>
      <div className="productGallery__main">
        <Image src={images[0]} alt={`${product.name} main product image`} width={900} height={1080} priority />
      </div>
      <div className="productGallery__thumbs" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button className={index === 0 ? "is-active" : undefined} type="button" key={image} aria-label={`View ${product.name} image ${index + 1}`}>
            <Image src={image} alt={`${product.name} thumbnail ${index + 1}`} width={180} height={216} />
          </button>
        ))}
      </div>
    </section>
  );
}
