"use client";

import { useState } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import type { Product } from "@/types/product";

export function ProductDetailClient({ product }: { product: Product }) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(product.colors.length === 1 ? product.colors[0]?.id ?? null : null);
  return (
    <>
      <ProductGallery product={product} selectedColorId={selectedColorId} />
      <ProductInfo product={product} onColorIdChange={setSelectedColorId} />
    </>
  );
}
