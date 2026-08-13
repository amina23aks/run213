"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type FallbackImageProps = ImageProps & { fallbackSrc: string };

/** Replaces failed remote media with an intentional local image. */
export function FallbackImage({ src, fallbackSrc, alt, onError, ...props }: FallbackImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src || fallbackSrc);

  useEffect(() => setResolvedSrc(src || fallbackSrc), [fallbackSrc, src]);

  return <Image {...props} src={resolvedSrc} alt={alt} onError={(event) => { onError?.(event); setResolvedSrc(fallbackSrc); }} />;
}
