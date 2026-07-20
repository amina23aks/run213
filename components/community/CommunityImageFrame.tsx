import Image from "next/image";

type CommunityImageFrameProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

export function CommunityImageFrame({ src, alt, sizes, className = "" }: CommunityImageFrameProps) {
  return (
    <div className={`communityImageFrame ${className}`.trim()}>
      <Image className="communityImageFrame__backdrop" src={src} alt="" aria-hidden="true" fill sizes={sizes} />
      <Image className="communityImageFrame__image" src={src} alt={alt} fill sizes={sizes} />
    </div>
  );
}
