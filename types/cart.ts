import type { Size } from "./product";

export interface CartItem {
  productId: string;
  size: Size;
  quantity: number;
  price: number;
  name: string;
  image: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemCount: number;
}
