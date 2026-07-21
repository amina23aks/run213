import { z } from "zod";
import { normalizeInstagram } from "@/lib/run-club/instagram";

export const RUN_CLUB_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const RUN_CLUB_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"] as const;
export const RUN_CLUB_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);
const trimmedRequired = (min: number, max: number, field: string) => z.string().trim().min(min, `${field} is required.`).max(max, `${field} is too long.`);
const trimmedOptional = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional()).transform((value) => value ?? null);

export function normalizeContact(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return trimmed.replace(/[\s().-]/g, "").replace(/^00/, "+");
}

export function getContactType(value: string): "email" | "phone" {
  return value.includes("@") ? "email" : "phone";
}

export function isValidContact(value: string) {
  const normalized = normalizeContact(value);
  const email = z.email().safeParse(normalized).success;
  const phone = /^\+?[0-9]{8,15}$/.test(normalized);
  return email || phone;
}

export const cloudinaryUploadProofSchema = z.object({
  publicId: z.string().trim().min(1),
  secureUrl: z.url().startsWith("https://"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.string().trim().toLowerCase().refine((value) => RUN_CLUB_ALLOWED_FORMATS.includes(value as typeof RUN_CLUB_ALLOWED_FORMATS[number]), "Unsupported image format."),
  bytes: z.number().int().positive().max(RUN_CLUB_MAX_IMAGE_BYTES, "Image must be 5MB or smaller."),
  version: z.union([z.string(), z.number()]).transform(String),
  signature: z.string().trim().min(20).optional(),
}).strict();

export const runClubSubmissionSchema = z.object({
  name: trimmedRequired(2, 80, "Name"),
  contact: z.string().trim().min(1, "Email or phone is required.").refine(isValidContact, "Enter a valid email or phone number."),
  instagram: trimmedOptional(60).refine((value) => value === null || normalizeInstagram(value) !== null, "Enter a valid Instagram username or URL."),
  wilaya: trimmedOptional(60),
  caption: trimmedOptional(280),
  consentAccepted: z.literal(true, { error: "Consent is required." }),
  proofImage: cloudinaryUploadProofSchema,
  website: z.string().max(0).optional().default(""),
}).strict();

export type RunClubSubmissionInput = z.infer<typeof runClubSubmissionSchema>;
