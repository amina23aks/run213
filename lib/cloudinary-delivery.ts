export const CLOUDINARY_IMAGE_WIDTHS = {
  productCard: 640,
  productDetail: 1440,
  productThumbnail: 240,
  lookCard: 720,
  lookDetail: 1440,
  adminThumbnail: 480,
  communityFeed: 720,
  communityAdmin: 960,
} as const;

type CloudinaryImageOptions = {
  width: number;
  crop?: "limit" | "fill" | "fit";
  gravity?: "auto" | "center";
};

/**
 * Adds unsigned delivery-only transformations to Cloudinary upload URLs.
 * Local, blob/data, non-Cloudinary, fetched-asset, and signed delivery URLs are
 * deliberately returned unchanged. Upload/API URLs never pass the path check.
 */
export function cloudinaryImageUrl(source: string, { width, crop = "limit", gravity }: CloudinaryImageOptions): string {
  if (!Number.isInteger(width) || width < 1) return source;

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return source;
  }

  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return source;
  const marker = "/image/upload/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return source;

  const deliveryPath = url.pathname.slice(markerIndex + marker.length);
  // Modifying a signed delivery URL would invalidate its signature.
  if (deliveryPath.startsWith("s--")) return source;

  const transformation = [
    `c_${crop}`,
    gravity ? `g_${gravity}` : null,
    `w_${width}`,
    "f_auto",
    "q_auto",
  ].filter(Boolean).join(",");
  url.pathname = `${url.pathname.slice(0, markerIndex)}${marker}${transformation}/${deliveryPath}`;
  return url.toString();
}
