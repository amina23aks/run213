import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import type { DeliveryInfo, DeliveryMode, DeliveryPricingStatus } from "@/types/order";

export type ShippingQuote = {
  mode: DeliveryMode;
  wilaya: string;
  amountDzd: number;
  status: DeliveryPricingStatus;
  provider: "wilaya_table";
};

export interface ShippingCalculator {
  quote(delivery: DeliveryInfo): Promise<ShippingQuote>;
}

export type WilayaDeliveryRate = {
  wilaya: string;
  homeDzd: number;
  deskDzd: number | null;
};

export const WILAYA_DELIVERY_RATES: WilayaDeliveryRate[] = ALGERIA_WILAYAS.map((wilaya) => {
  const code = Number(wilaya.code);
  const zone = code <= 16 ? 0 : code <= 31 ? 1 : code <= 48 ? 2 : 3;
  const homeDzd = 450 + zone * 150;
  return { wilaya: wilaya.name, homeDzd, deskDzd: Math.max(350, homeDzd - 150) };
});

export function getShippingQuote(delivery: Pick<DeliveryInfo, "wilaya" | "deliveryMode">): ShippingQuote {
  const rate = WILAYA_DELIVERY_RATES.find((entry) => entry.wilaya === delivery.wilaya);
  if (!rate) throw new Error("Unsupported wilaya");
  const amountDzd = delivery.deliveryMode === "home" ? rate.homeDzd : rate.deskDzd;
  if (amountDzd === null) throw new Error("Delivery mode is not available for this wilaya");
  return { mode: delivery.deliveryMode, wilaya: delivery.wilaya, amountDzd, status: "quoted", provider: "wilaya_table" };
}

export class WilayaTableShippingCalculator implements ShippingCalculator {
  async quote(delivery: DeliveryInfo): Promise<ShippingQuote> {
    return getShippingQuote(delivery);
  }
}

export const shippingCalculator: ShippingCalculator = new WilayaTableShippingCalculator();
