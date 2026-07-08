import type { OrderItem } from "@/types/order";

export type StockReservationPlan = {
  shouldReserve: boolean;
  reason: "future_admin_stock";
  items: OrderItem[];
};

export function prepareStockReservation(items: OrderItem[]): StockReservationPlan {
  return {
    shouldReserve: false,
    reason: "future_admin_stock",
    items,
  };
}
