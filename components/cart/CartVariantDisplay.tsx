import type { CartItem } from "@/types/cart";

type CartVariantDisplayProps = {
  item: Pick<CartItem, "selectedColor" | "selectedSize">;
};

const COLOR_HEX_BY_NAME: Record<string, string> = {
  black: "#111111",
  cream: "#f6efe4",
  grey: "#77776f",
  gray: "#77776f",
  lime: "#c7f400",
  white: "#ffffff",
};

function getColorDotStyle(colorName: string): { backgroundColor: string } {
  return { backgroundColor: COLOR_HEX_BY_NAME[colorName.toLowerCase()] ?? colorName };
}

export function CartVariantDisplay({ item }: CartVariantDisplayProps) {
  if (!item.selectedColor && !item.selectedSize) return null;

  return (
    <div className="cartVariantDisplay" aria-label="Selected variant">
      {item.selectedColor ? <span className="cartVariantDisplay__color" style={getColorDotStyle(item.selectedColor)} aria-label={item.selectedColor} title={item.selectedColor} /> : null}
      {item.selectedSize ? <span className="cartVariantDisplay__size">{item.selectedSize}</span> : null}
    </div>
  );
}
