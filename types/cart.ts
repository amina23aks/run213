export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceDzd: number;
  image: string;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  maxQuantity?: number;
};

export type Cart = {
  items: CartItem[];
  subtotalDzd: number;
  itemCount: number;
};
