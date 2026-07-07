import Image from "next/image";
import { formatDzd } from "@/constants/products";
import type { CartItem as CartLineItem } from "@/types/cart";

type CartItemProps = {
  item: CartLineItem;
  lineKey: string;
  onRemove: (lineKey: string) => void;
  onUpdateQuantity: (lineKey: string, quantity: number) => void;
};

export function CartItem({ item, lineKey, onRemove, onUpdateQuantity }: CartItemProps) {
  const optionText = [item.selectedColor, item.selectedSize ? `Size ${item.selectedSize}` : null].filter(Boolean).join(" / ");

  return (
    <article className="cartItem">
      <div className="cartItem__image">
        <Image src={item.image} alt={`${item.name} cart thumbnail`} width={180} height={220} />
      </div>
      <div className="cartItem__content">
        <div className="cartItem__topline">
          <h3>{item.name}</h3>
          <span>{formatDzd(item.priceDzd * item.quantity)}</span>
        </div>
        <p>{optionText || "Selected item"}</p>
        <div className="cartItem__controls">
          <div aria-label={`${item.name} quantity controls`}>
            <button type="button" aria-label={`Decrease ${item.name} quantity`} onClick={() => onUpdateQuantity(lineKey, item.quantity - 1)}>−</button>
            <strong>{item.quantity}</strong>
            <button type="button" aria-label={`Increase ${item.name} quantity`} onClick={() => onUpdateQuantity(lineKey, item.quantity + 1)}>+</button>
          </div>
          <button className="cartItem__remove" type="button" onClick={() => onRemove(lineKey)}>Remove</button>
        </div>
      </div>
    </article>
  );
}
