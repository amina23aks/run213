"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
  selectedColorId?: string | null;
};

export function ProductGallery({ product, selectedColorId }: ProductGalleryProps) {
  const images = useMemo(() => product.images.length ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder) : [{ id: "placeholder", url: "/placeholders/product-placeholder.webp", alt: `${product.name} placeholder`, sortOrder: 0, isPrimary: true, colorId: null }], [product.images, product.name]);
  const fallbackImageId = images.find((image) => image.isPrimary)?.id ?? images[0]?.id ?? "placeholder";
  const [activeImageId, setActiveImageId] = useState(fallbackImageId);
  const previousColorId = useRef<string | null | undefined>(selectedColorId);

  useEffect(() => {
    if (previousColorId.current === selectedColorId) return;
    previousColorId.current = selectedColorId;
    const linkedImage = selectedColorId ? images.find((image) => image.colorId === selectedColorId) : null;
    setActiveImageId(linkedImage?.id ?? fallbackImageId);
  }, [fallbackImageId, images, selectedColorId]);

  const activeImage = images.find((image) => image.id === activeImageId) ?? images[0];

  return (
    <section className="productGallery" aria-label={`${product.name} gallery`}>
      <div className="productGallery__main">
        <Image key={activeImage.id} src={activeImage.url} alt={activeImage.alt || `${product.name} main product image`} width={900} height={1080} priority />
      </div>
      <div className="productGallery__thumbs" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button className={image.id === activeImage.id ? "is-active" : undefined} type="button" key={image.id} aria-label={`View ${product.name} image ${index + 1}`} onClick={() => setActiveImageId(image.id)}>
            <Image src={image.url} alt={image.alt || `${product.name} thumbnail ${index + 1}`} width={180} height={216} />
          </button>
        ))}
      </div>
    </section>
  );
}
