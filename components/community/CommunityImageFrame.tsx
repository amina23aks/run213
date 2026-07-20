import Image from "next/image";

type CommunityImageFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  variant?: "grid" | "marquee";
  className?: string;
};

export function CommunityImageFrame({ src, alt, sizes, variant = "grid", className = "" }: CommunityImageFrameProps) {
  return (
    <div className={["communityImageFrame", `communityImageFrame--${variant}`, className].filter(Boolean).join(" ")}>
      <Image className="communityImageFrame__backdrop" src={src} alt="" aria-hidden="true" fill sizes={sizes} />
      <Image className="communityImageFrame__image" src={src} alt={alt} fill sizes={sizes} />
    </div>
  );
}
