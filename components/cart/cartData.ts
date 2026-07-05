export type CartLineItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  quantity: number;
  price: string;
  image: string;
};

export const mockCartItems: CartLineItem[] = [
  {
    id: "oversized-tee-black-m",
    name: "Oversized Tee",
    color: "Black",
    size: "M",
    quantity: 1,
    price: "2,900 DZD",
    image: "/tshirt.png",
  },
];

export const mockCartSubtotal = "2,900 DZD";
