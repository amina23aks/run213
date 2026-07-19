import { z } from "zod";

const trimmedString = z.string().trim();
const optionalNumber = z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
});

export const lookImageSchema = z.object({
  url: trimmedString.min(1).max(500),
  alt: trimmedString.max(160).default(""),
  publicId: trimmedString.max(240).optional(),
});

export const lookCollectionInputSchema = z.object({
  slug: trimmedString.min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: trimmedString.min(2).max(120),
  subtitle: trimmedString.max(180).default(""),
  description: trimmedString.max(1200).default(""),
  cardImage: lookImageSchema,
  status: z.enum(["draft", "active"]),
  sortOrder: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().min(0).max(100_000)),
});

export const lookInputSchema = z.object({
  collectionId: trimmedString.min(1).max(140),
  collectionSlug: trimmedString.min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  slug: trimmedString.min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: trimmedString.min(2).max(120),
  numberLabel: trimmedString.max(40).optional().transform((value) => value || null),
  description: trimmedString.max(1200).default(""),
  priceDzd: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().positive().max(1_000_000)),
  compareAtPriceDzd: optionalNumber.pipe(z.number().int().positive().max(1_000_000).nullable()),
  discountPercent: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value) => value === null || value === undefined || value === "" ? 0 : Number(value)).pipe(z.number().int().min(0).max(99)).default(0),
  isPromo: z.boolean().default(false),
  costPriceDzd: optionalNumber.pipe(z.number().int().min(0).max(1_000_000).nullable()),
  heroImage: lookImageSchema,
  figureImage: lookImageSchema.nullable().optional(),
  productIds: z.array(trimmedString.min(1).max(140)).min(1).max(12),
  status: z.enum(["draft", "active"]),
  sortOrder: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
  showAsHomepageFigure: z.boolean(),
  homepageFigureOrder: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
}).superRefine((value, context) => {
  if (value.compareAtPriceDzd !== null && value.compareAtPriceDzd <= value.priceDzd) {
    context.addIssue({ code: "custom", path: ["compareAtPriceDzd"], message: "Compare-at price must be higher than price." });
  }
});

export type LookCollectionInput = z.infer<typeof lookCollectionInputSchema>;
export type LookInput = z.infer<typeof lookInputSchema>;
