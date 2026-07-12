import Image from "next/image";
import type { ProductDraftColor, ProductDraftImage } from "@/components/admin/products/types";

type AdminProductImagePreviewProps = {
  images: ProductDraftImage[];
  colors: ProductDraftColor[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ProductDraftImage>) => void;
  onSetPrimary: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
};

export function AdminProductImagePreview({ images, colors, onRemove, onUpdate, onSetPrimary, onMove }: AdminProductImagePreviewProps) {
  if (!images.length) {
    return (
      <div className="adminProductImageEmpty">
        <strong>No images yet.</strong>
        <span>Upload product images from Cloudinary.</span>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="adminProductImageGrid" aria-label="Image previews">
      {sortedImages.map((image, index) => (
        <figure className="adminProductImageCard" key={image.id}>
          <div>
            <Image src={image.url} alt={`Product preview ${index + 1}`} width={140} height={140} unoptimized />
            <button type="button" onClick={() => onRemove(image.id)} aria-label={`Remove image ${index + 1}`}>×</button>
          </div>
          <figcaption>{image.isPrimary ? "Primary" : `Image ${index + 1}`}</figcaption>
          <div className="adminProductImageControls">
            <button type="button" onClick={() => onMove(image.id, -1)} disabled={index === 0}>←</button>
            <button type="button" onClick={() => onMove(image.id, 1)} disabled={index === sortedImages.length - 1}>→</button>
            <button type="button" onClick={() => onSetPrimary(image.id)} disabled={image.isPrimary}>Primary</button>
          </div>
          <label className="adminProductImageColor">
            <span>Color</span>
            <select value={image.colorId ?? ""} onChange={(event) => onUpdate(image.id, { colorId: event.target.value || null })}>
              <option value="">All colors</option>
              {colors.map((color) => <option value={color.id} key={color.id}>{color.name || color.hex}</option>)}
            </select>
          </label>
        </figure>
      ))}
    </div>
  );
}
