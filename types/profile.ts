import type { DeliveryMode } from "@/types/order";

export type CustomerProfile = {
  fullName: string;
  phone: string;
  wilaya: string;
  address: string;
  deliveryMode: DeliveryMode;
  notes: string;
};

export const EMPTY_CUSTOMER_PROFILE: CustomerProfile = {
  fullName: "", phone: "", wilaya: "", address: "", deliveryMode: "home", notes: "",
};
