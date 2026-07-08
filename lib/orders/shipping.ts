import type { DeliveryInfo, DeliveryMode, DeliveryPricingStatus } from "@/types/order";

export type ShippingQuote = {
  mode: DeliveryMode;
  wilaya: string;
  amountDzd: number | null;
  status: DeliveryPricingStatus;
  provider: "manual_pending" | "wilaya_table";
};

export interface ShippingCalculator {
  quote(delivery: DeliveryInfo): Promise<ShippingQuote>;
}

export class PendingWilayaShippingCalculator implements ShippingCalculator {
  async quote(delivery: DeliveryInfo): Promise<ShippingQuote> {
    return {
      mode: delivery.deliveryMode,
      wilaya: delivery.wilaya,
      amountDzd: null,
      status: "pending_quote",
      provider: "manual_pending",
    };
  }
}

export const shippingCalculator: ShippingCalculator = new PendingWilayaShippingCalculator();
