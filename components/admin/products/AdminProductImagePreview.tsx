import Image from "next/image";
import type { ProductDraftImage } from "@/components/admin/products/types";

type AdminProductImagePreviewProps = {
  images: ProductDraftImage[];
  onRemove: (id: string) => void;
};

export function AdminProductImagePreview({ images, onRemove }: AdminProductImagePreviewProps) {
  if (!images.length) {
    return (
      <div className="adminProductImageEmpty">
        <strong>No images yet.</strong>
        <span>Upload product images from Cloudinary.</span>
      </div>
    );
  }

  return (
    <div className="adminProductImageGrid" aria-label="Image previews">
      {images.map((image, index) => (
        <figure className="adminProductImageCard" key={image.id}>
          <div>
            <Image src={image.url} alt={`Product preview ${index + 1}`} width={220} height={260} unoptimized />
            <button type="button" onClick={() => onRemove(image.id)} aria-label={`Remove image ${index + 1}`}>×</button>
          </div>
          <figcaption>{image.url}</figcaption>
        </figure>
      ))}
    </div>
  );
}
