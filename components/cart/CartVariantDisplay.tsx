import type { CartItem } from "@/types/cart";

type CartVariantDisplayProps = {
  item: Pick<CartItem, "selectedColor" | "selectedColorHex" | "selectedSize">;
};

const COLOR_HEX_BY_NAME: Record<string, string> = {
  black: "#111111",
  cream: "#f6efe4",
  grey: "#77776f",
  gray: "#77776f",
  lime: "#c7f400",
  white: "#ffffff",
};

function getColorDotStyle(colorName: string, colorHex?: string | null): { backgroundColor: string } {
  return { backgroundColor: colorHex ?? COLOR_HEX_BY_NAME[colorName.toLowerCase()] ?? "transparent" };
}

export function CartVariantDisplay({ item }: CartVariantDisplayProps) {
  if (!item.selectedColor && !item.selectedSize) return null;

  return (
    <div className="cartVariantDisplay" aria-label="Selected variant">
      {item.selectedColor ? <><span className="cartVariantDisplay__color" style={getColorDotStyle(item.selectedColor, item.selectedColorHex)} aria-label={`Color ${item.selectedColor}`} title={item.selectedColor} /><span>{item.selectedColor}</span></> : null}
      {item.selectedSize ? <span className="cartVariantDisplay__size">{item.selectedSize}</span> : null}
    </div>
  );
}
