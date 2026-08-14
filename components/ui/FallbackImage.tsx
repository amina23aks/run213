"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type FallbackImageProps = ImageProps & { fallbackSrc: string };

/** Replaces failed remote media with an intentional local image. */
export function FallbackImage({ src, fallbackSrc, alt, onError, ...props }: FallbackImageProps) {
  const requestedSrc = src || fallbackSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = failedSrc === requestedSrc ? fallbackSrc : requestedSrc;

  return <Image {...props} src={resolvedSrc} alt={alt} onError={(event) => { onError?.(event); setFailedSrc(String(requestedSrc)); }} />;
}
