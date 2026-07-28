import { z } from "zod";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { normalizePhone } from "@/lib/orders/validation";

const wilayas = new Set(ALGERIA_WILAYAS.map(({ name }) => name));
export const customerProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: z.string().trim().min(1, "Enter your phone number.").transform(normalizePhone)
    .refine((value) => /^(?:\+213|0)[5-7][0-9]{8}$/.test(value), "Enter a valid Algerian phone number."),
  wilaya: z.string().trim().refine((value) => wilayas.has(value), "Choose a valid wilaya."),
  address: z.string().trim().min(3, "Enter your delivery address.").max(300),
  deliveryMode: z.enum(["home", "desk"]),
  notes: z.string().trim().max(500).default(""),
}).strict();

export type ProfileInput = z.input<typeof customerProfileSchema>;
