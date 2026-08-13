import Image from "next/image";
import { CLOUDINARY_IMAGE_WIDTHS, cloudinaryImageUrl } from "@/lib/cloudinary-delivery";

type CommunityImageFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  variant?: "grid" | "marquee";
  fit?: "cover" | "contain";
  className?: string;
};

export function CommunityImageFrame({ src, alt, sizes, variant = "grid", fit = "cover", className = "" }: CommunityImageFrameProps) {
  const deliverySrc = cloudinaryImageUrl(src, { width: CLOUDINARY_IMAGE_WIDTHS.communityFeed });
  return (
    <div className={["communityImageFrame", `communityImageFrame--${variant}`, `communityImageFrame--${fit}`, className].filter(Boolean).join(" ")}>
      <Image className="communityImageFrame__backdrop" src={deliverySrc} alt="" aria-hidden="true" fill sizes={sizes} unoptimized />
      <Image className="communityImageFrame__image" src={deliverySrc} alt={alt} fill sizes={sizes} unoptimized />
    </div>
  );
}
