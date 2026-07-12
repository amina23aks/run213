import { z } from "zod";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import type { CreateOrderRequest } from "@/types/order";

const VALID_WILAYAS = new Set(ALGERIA_WILAYAS.map((wilaya) => wilaya.name));

export const createOrderRequestSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(8).max(20),
    email: z.string().trim().email().max(120).nullable().optional(),
  }),
  delivery: z.object({
    wilaya: z.string().trim().refine((value) => VALID_WILAYAS.has(value), "Unsupported wilaya"),
    deliveryMode: z.enum(["home", "desk"]),
    address: z.string().trim().min(5).max(180),
    commune: z.string().trim().min(2).max(80).nullable().optional(),
    notes: z.string().trim().max(300).nullable().optional(),
  }),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(120),
    selectedSize: z.string().trim().min(1).max(24).nullable().optional(),
    selectedColor: z.string().trim().min(1).max(40).nullable().optional(),
    quantity: z.number().int().min(1).max(20),
    lookGroupId: z.string().trim().min(1).max(160).nullable().optional(),
    lookId: z.string().trim().min(1).max(140).nullable().optional(),
    lookSlug: z.string().trim().min(1).max(160).nullable().optional(),
    lookName: z.string().trim().min(1).max(120).nullable().optional(),
    lookImage: z.string().trim().min(1).max(500).nullable().optional(),
  })).min(1).max(20),
  idempotencyKey: z.string().trim().min(8).max(120).nullable().optional(),
}) satisfies z.ZodType<CreateOrderRequest>;

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

export function normalizeEmail(email: string | null | undefined): string | null {
  return email ? email.trim().toLowerCase() : null;
}
