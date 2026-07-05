import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { mockCartItems, mockCartSubtotal } from "@/components/cart/cartData";

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  return (
    <div className={isOpen ? "cartDrawerShell is-open" : "cartDrawerShell"} aria-hidden={!isOpen}>
      <button className="cartDrawerOverlay" type="button" aria-label="Close cart" onClick={onClose} />
      <aside className="cartDrawer" aria-label="Cart drawer" aria-modal="true" role="dialog">
        <header className="cartDrawer__header">
          <h2>YOUR CART</h2>
          <button type="button" aria-label="Close cart" onClick={onClose}>×</button>
        </header>

        {mockCartItems.length > 0 ? (
          <>
            <div className="cartDrawer__items">
              {mockCartItems.map((item) => <CartItem item={item} key={item.id} />)}
            </div>
            <footer className="cartDrawer__footer">
              <p className="cartDrawer__subtotal"><span>Subtotal</span><strong>{mockCartSubtotal}</strong></p>
              <p className="cartDrawer__note">Delivery calculated at checkout.</p>
              <Link className="cartDrawer__checkout" href="/checkout" onClick={onClose}>CHECKOUT</Link>
              <Link className="cartDrawer__secondary" href="/shop" onClick={onClose}>CONTINUE SHOPPING</Link>
            </footer>
          </>
        ) : (
          <div className="cartDrawer__empty">
            <p>Your cart is empty.</p>
            <span>Start with DROP_001.</span>
            <Link href="/shop" onClick={onClose}>SHOP DROP_001</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
