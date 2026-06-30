export type OrderStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";

export type OrderCustomer = {
  name: string;
  phone: string;
  city: string;
  address: string;
};

export type Order = {
  id: string;
  customer: OrderCustomer;
  status: OrderStatus;
  totalDzd: number;
  createdAt: string;
};
