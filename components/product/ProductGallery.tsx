"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product } from "@/types/product";

type ProductGalleryProps = {
  product: Product;
  selectedColorId?: string | null;
};

export function ProductGallery({ product, selectedColorId }: ProductGalleryProps) {
  const images = useMemo(() => product.images.length ? [...product.images].sort((a, b) => a.sortOrder - b.sortOrder) : [{ id: "placeholder", url: "/placeholders/product-placeholder.webp", alt: `${product.name} placeholder`, sortOrder: 0, isPrimary: true, colorId: null }], [product.images, product.name]);
  const fallbackImageId = images.find((image) => image.isPrimary)?.id ?? images[0]?.id ?? "placeholder";
  const [manualSelection, setManualSelection] = useState<{ imageId: string; colorId: string | null | undefined }>(() => ({ imageId: fallbackImageId, colorId: selectedColorId }));
  const linkedColorImageId = selectedColorId ? images.find((image) => image.colorId === selectedColorId)?.id ?? null : null;
  const activeImageId = manualSelection.colorId === selectedColorId ? manualSelection.imageId : linkedColorImageId ?? manualSelection.imageId;
  const activeImage = images.find((image) => image.id === activeImageId) ?? images.find((image) => image.id === fallbackImageId) ?? images[0];

  return (
    <section className="productGallery" aria-label={`${product.name} gallery`}>
      <div className="productGallery__main">
        <Image key={activeImage.id} src={activeImage.url} alt={activeImage.alt || `${product.name} main product image`} width={900} height={1080} priority />
      </div>
      <div className="productGallery__thumbs" aria-label="Product thumbnails">
        {images.map((image, index) => (
          <button className={image.id === activeImage.id ? "is-active" : undefined} type="button" key={image.id} aria-label={`View ${product.name} image ${index + 1}`} onClick={() => setManualSelection({ imageId: image.id, colorId: selectedColorId })}>
            <Image src={image.url} alt={image.alt || `${product.name} thumbnail ${index + 1}`} width={180} height={216} />
          </button>
        ))}
      </div>
    </section>
  );
}
