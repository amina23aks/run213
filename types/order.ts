import type { CartItem } from "./cart";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    wilaya: string;
    address: string;
  };
  createdAt: number;
}
