import { z } from "zod";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import type { CreateOrderRequest } from "@/types/order";

const VALID_WILAYAS = new Set(ALGERIA_WILAYAS.map((wilaya) => wilaya.name));

export const customerNameSchema = z.string().trim().min(2, "Full name must contain at least 2 characters.").max(80, "Full name must contain at most 80 characters.");
export const customerPhoneSchema = z.string().trim().min(8, "Enter a valid Algerian phone number.").max(20, "Enter a valid Algerian phone number.").refine(
  (phone) => /^(?:\+213|0)[567]\d{8}$/.test(normalizePhone(phone)),
  "Enter a valid Algerian phone number.",
);
export const wilayaSchema = z.string().trim().refine((value) => VALID_WILAYAS.has(value), "Unsupported wilaya.");
export const deliveryModeSchema = z.enum(["home", "desk"], { message: "Unsupported delivery mode." });
export const deliveryAddressSchema = z.string().trim().min(5, "Address must contain at least 5 characters.").max(180, "Address must contain at most 180 characters.");
export const deliveryNotesSchema = z.string().trim().max(300, "Delivery notes must contain at most 300 characters.").nullable().optional();

export const customerDeliveryEditSchema = z.object({
  fullName: customerNameSchema,
  phone: customerPhoneSchema,
  wilaya: wilayaSchema,
  deliveryMode: deliveryModeSchema,
  address: deliveryAddressSchema,
  notes: deliveryNotesSchema,
}).strict();

export const createOrderRequestSchema = z.object({
  customer: z.object({
    fullName: customerNameSchema,
    phone: customerPhoneSchema,
    email: z.string().trim().email().max(120).nullable().optional(),
  }),
  delivery: z.object({
    wilaya: wilayaSchema,
    deliveryMode: deliveryModeSchema,
    address: deliveryAddressSchema,
    commune: z.string().trim().min(2).max(80).nullable().optional(),
    notes: deliveryNotesSchema,
  }),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(120),
    selectedSize: z.string().trim().min(1).max(24).nullable().optional(),
    selectedColorId: z.string().trim().min(1).max(120).nullable().optional(),
    selectedColor: z.string().trim().min(1).max(40).nullable().optional(),
    quantity: z.number().int().min(1).max(20),
    lookGroupId: z.string().trim().min(1).max(160).nullable().optional(),
    lookId: z.string().trim().min(1).max(140).nullable().optional(),
    lookSlug: z.string().trim().min(1).max(160).nullable().optional(),
    lookName: z.string().trim().min(1).max(120).nullable().optional(),
    lookImage: z.string().trim().min(1).max(500).nullable().optional(),
    lookOriginalProductIds: z.array(z.string().trim().min(1).max(140)).max(20).nullable().optional(),
  })).min(1).max(20),
  idempotencyKey: z.string().trim().min(8).max(120).nullable().optional(),
}) satisfies z.ZodType<CreateOrderRequest>;

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

export function normalizeEmail(email: string | null | undefined): string | null {
  return email ? email.trim().toLowerCase() : null;
}
