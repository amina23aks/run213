import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import ECONOMIC_SHIPPING_RATES from "@/data/economicShippingRates.json";
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

const ratesByCode = new Map(ECONOMIC_SHIPPING_RATES.map((rate) => [rate.code, rate]));
const canonicalCodes = new Set(ALGERIA_WILAYAS.map((wilaya) => wilaya.code));

if (ratesByCode.size !== ECONOMIC_SHIPPING_RATES.length || ECONOMIC_SHIPPING_RATES.length !== ALGERIA_WILAYAS.length || ECONOMIC_SHIPPING_RATES.some((rate) => !canonicalCodes.has(rate.code))) {
  throw new Error("Economic shipping rates must cover each canonical Wilaya exactly once");
}

export const WILAYA_DELIVERY_RATES: WilayaDeliveryRate[] = ALGERIA_WILAYAS.map((wilaya) => {
  const rate = ratesByCode.get(wilaya.code);
  if (!rate) throw new Error(`Missing economic shipping rate for Wilaya ${wilaya.code}`);
  return { wilaya: wilaya.name, homeDzd: rate.homeDzd, deskDzd: rate.deskDzd };
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
