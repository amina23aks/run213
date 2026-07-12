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
  heroImage: lookImageSchema,
  figureImage: lookImageSchema.nullable().optional(),
  productIds: z.array(trimmedString.min(1).max(140)).min(1).max(12),
  status: z.enum(["draft", "active"]),
  sortOrder: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().min(0).max(100_000)),
  showAsHomepageFigure: z.boolean(),
  homepageFigureOrder: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
}).superRefine((value, context) => {
  if (value.showAsHomepageFigure && value.homepageFigureOrder === null) {
    context.addIssue({ code: "custom", path: ["homepageFigureOrder"], message: "Homepage figure order is required when enabled." });
  }
});

export type LookCollectionInput = z.infer<typeof lookCollectionInputSchema>;
export type LookInput = z.infer<typeof lookInputSchema>;
