export type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  size: string;
  color: string;
  priceDzd: number;
};

export type Cart = {
  items: CartItem[];
  subtotalDzd: number;
};
