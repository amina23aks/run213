import Image from "next/image";
import { CartVariantDisplay } from "@/components/cart/CartVariantDisplay";
import { formatDzd } from "@/constants/products";
import type { CartItem } from "@/types/cart";
import { getGroupSubtotal } from "@/components/cart/cartGrouping";

type CartLookGroupProps = {
  items: CartItem[];
  onRemoveGroup: (lookGroupId: string) => void;
};

export function CartLookGroup({ items, onRemoveGroup }: CartLookGroupProps) {
  const firstItem = items[0];
  if (!firstItem?.lookGroupId) return null;
  const subtotal = getGroupSubtotal(items);

  return (
    <article className="cartLookGroup">
      <header className="cartLookGroup__header">
        <div className="cartLookGroup__image">
          <Image src={firstItem.lookImage ?? firstItem.image} alt={`${firstItem.lookName ?? "Look"} cart thumbnail`} width={180} height={140} />
        </div>
        <div>
          <span>LOOK</span>
          <h3>{firstItem.lookName ?? "Selected Look"}</h3>
          {firstItem.lookDescription ? <p>{firstItem.lookDescription}</p> : null}
          <strong>{items.length} item{items.length === 1 ? "" : "s"} · {formatDzd(subtotal)}</strong>
        </div>
        <button type="button" onClick={() => onRemoveGroup(firstItem.lookGroupId!)}>Remove Look</button>
      </header>
      <div className="cartLookGroup__items">
        {items.map((item) => (
          <div className="cartLookGroup__line" key={`${item.productId}-${item.selectedSize ?? "no-size"}-${item.selectedColor ?? "no-color"}`}>
            <Image src={item.image} alt={`${item.name} thumbnail`} width={72} height={72} />
            <div>
              <strong>{item.name}</strong>
              <CartVariantDisplay item={item} />
              <span>Qty {item.quantity}</span>
            </div>
            <em>Included</em>
          </div>
        ))}
      </div>
    </article>
  );
}
