import Image from "next/image";
import type { CartLineItem } from "@/components/cart/cartData";

type CartItemProps = {
  item: CartLineItem;
};

export function CartItem({ item }: CartItemProps) {
  return (
    <article className="cartItem">
      <div className="cartItem__image">
        <Image src={item.image} alt={`${item.name} cart thumbnail`} width={180} height={220} />
      </div>
      <div className="cartItem__content">
        <div className="cartItem__topline">
          <h3>{item.name}</h3>
          <span>{item.price}</span>
        </div>
        <p>{item.color} / Size {item.size}</p>
        <div className="cartItem__controls">
          <div aria-label={`${item.name} quantity controls`}>
            <button type="button" aria-label={`Decrease ${item.name} quantity`}>−</button>
            <strong>{item.quantity}</strong>
            <button type="button" aria-label={`Increase ${item.name} quantity`}>+</button>
          </div>
          <button className="cartItem__remove" type="button">Remove</button>
        </div>
      </div>
    </article>
  );
}
