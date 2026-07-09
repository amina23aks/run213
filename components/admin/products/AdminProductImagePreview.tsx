import Image from "next/image";

type AdminProductImagePreviewProps = {
  urls: string[];
};

export function AdminProductImagePreview({ urls }: AdminProductImagePreviewProps) {
  if (!urls.length) {
    return (
      <div className="adminProductImageEmpty">
        <strong>No images yet.</strong>
        <span>Add one URL or local path per line. Example /tshirt.png</span>
      </div>
    );
  }

  return (
    <div className="adminProductImageGrid" aria-label="Image previews">
      {urls.map((url) => (
        <figure className="adminProductImageCard" key={url}>
          <div>
            <Image src={url} alt="Product preview" width={220} height={260} unoptimized />
          </div>
          <figcaption>{url}</figcaption>
        </figure>
      ))}
    </div>
  );
}
