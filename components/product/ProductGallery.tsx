"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
  selectedColorId?: string | null;
};

export function ProductGallery({ product, selectedColorId }: ProductGalleryProps) {
  const images = product.images.length ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder) : [{ id: "placeholder", url: "/placeholders/product-placeholder.webp", alt: `${product.name} placeholder`, sortOrder: 0, isPrimary: true, colorId: null }];
  const preferredIndex = selectedColorId ? images.findIndex((image) => image.colorId === selectedColorId) : -1;
  const fallbackIndex = images.findIndex((image) => image.isPrimary);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, preferredIndex, fallbackIndex));
  const effectiveIndex = preferredIndex >= 0 ? preferredIndex : activeIndex;
  const activeImage = images[effectiveIndex] ?? images[0];

  return (
    <section className="productGallery" aria-label={`${product.name} gallery`}>
      <div className="productGallery__main">
        <Image src={activeImage.url} alt={activeImage.alt || `${product.name} main product image`} width={900} height={1080} priority />
      </div>
      <div className="productGallery__thumbs" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button className={index === effectiveIndex ? "is-active" : undefined} type="button" key={`${image.url}-${index}`} aria-label={`View ${product.name} image ${index + 1}`} onClick={() => setActiveIndex(index)}>
            <Image src={image.url} alt={image.alt || `${product.name} thumbnail ${index + 1}`} width={180} height={216} />
          </button>
        ))}
      </div>
    </section>
  );
}
