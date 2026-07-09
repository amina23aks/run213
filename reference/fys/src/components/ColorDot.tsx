"use client";

/**
 * Small colored circle component for displaying product colors.
 * Used in cart, checkout, and orders instead of hex text.
 */
export function ColorDot({ hex, size = "sm" }: { hex: string; size?: "xs" | "sm" }) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
  };

  return (
    <span
      className={`${sizeClasses[size]} inline-block rounded-full border border-white/30 shadow-[0_0_0_1px_rgba(0,0,0,0.1)]`}
      style={{ backgroundColor: hex }}
      aria-label={`Color: ${hex}`}
    />
  );
}

