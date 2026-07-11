"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
};

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = product.images.length ? product.images : [{ url: "/placeholders/product-placeholder.webp", alt: `${product.name} placeholder` }];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <section className="productGallery" aria-label={`${product.name} gallery`}>
      <div className="productGallery__main">
        <Image src={activeImage.url} alt={activeImage.alt || `${product.name} main product image`} width={900} height={1080} priority />
      </div>
      <div className="productGallery__thumbs" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button className={index === activeIndex ? "is-active" : undefined} type="button" key={`${image.url}-${index}`} aria-label={`View ${product.name} image ${index + 1}`} onClick={() => setActiveIndex(index)}>
            <Image src={image.url} alt={image.alt || `${product.name} thumbnail ${index + 1}`} width={180} height={216} />
          </button>
        ))}
      </div>
    </section>
  );
}
