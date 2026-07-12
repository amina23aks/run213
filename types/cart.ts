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
  lookGroupId?: string;
  lookId?: string;
  lookSlug?: string;
  lookName?: string;
  lookImage?: string;
  lookDescription?: string;
};

export type Cart = {
  items: CartItem[];
  subtotalDzd: number;
  itemCount: number;
};
