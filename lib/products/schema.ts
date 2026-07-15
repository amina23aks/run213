import { z } from "zod";

export const productCategorySchema = z.enum(["tshirts", "pants", "hoodies", "accessories"]);
export const productStatusSchema = z.enum(["draft", "active", "archived"]);
export const productStockModeSchema = z.enum(["unlimited", "limited"]);

const trimmedString = z.string().trim();
const optionalNumber = z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
});

export const adminProductInputSchema = z.object({
  name: trimmedString.min(2).max(120),
  slug: trimmedString.min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: trimmedString.max(2000).default(""),
  category: productCategorySchema,
  basePriceDzd: optionalNumber.pipe(z.number().int().positive().max(1_000_000).nullable()),
  priceDzd: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().positive().max(1_000_000)),
  compareAtPriceDzd: optionalNumber.pipe(z.number().int().positive().max(1_000_000).nullable()),
  costPriceDzd: optionalNumber.pipe(z.number().int().positive().max(1_000_000).nullable()),
  discountPercent: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((value) => value === null || value === undefined || value === "" ? 0 : Number(value)).pipe(z.number().int().min(0).max(100)),
  images: z.array(z.object({ id: trimmedString.max(120).optional(), url: trimmedString.min(1).max(500), alt: trimmedString.max(160).default(""), publicId: trimmedString.max(240).optional(), sortOrder: z.union([z.number(), z.string(), z.undefined()]).transform((value) => value === undefined ? 0 : Number(value)).pipe(z.number().int().min(0).max(100_000)), isPrimary: z.boolean().default(false), colorId: trimmedString.max(120).nullable().optional() })).min(1).max(8),
  colors: z.array(z.object({ id: trimmedString.max(120).optional(), name: trimmedString.max(60).optional().transform((value) => value || "Color"), hex: trimmedString.regex(/^#[0-9a-fA-F]{6}$/).transform((value) => value.toUpperCase()) })).min(1).max(12),
  sizes: z.array(z.object({ label: trimmedString.min(1).max(20) })).max(12).default([]),
  status: z.enum(["draft", "active"]),
  inStock: z.boolean(),
  stockMode: productStockModeSchema,
  stockQty: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
  isPromo: z.boolean(),
  featured: z.boolean().default(false),
  sizeGuideEnabled: z.boolean().default(false),
  sizeGuideImageUrl: trimmedString.max(500).optional().transform((value) => value || null),
  sizeGuideImagePublicId: trimmedString.max(240).optional().transform((value) => value || null),
  dropSlug: z.union([z.literal("drop-001"), z.literal(""), z.null()]).transform((value) => value === "drop-001" ? "drop-001" : null),
  sortOrder: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().min(0).max(100_000)),
  showInDrop001: z.boolean(),
  showInFeaturedDrop: z.boolean(),
  showInShopTheLook: z.boolean(),
  featuredSortOrder: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
  lookGroupSlug: trimmedString.max(100).optional().transform((value) => value || null),
}).superRefine((value, context) => {
  if (value.stockMode === "limited" && value.stockQty === null) {
    context.addIssue({ code: "custom", path: ["stockQty"], message: "stockQty is required for limited stock." });
  }
  if (value.sizeGuideEnabled && !value.sizeGuideImageUrl) {
    context.addIssue({ code: "custom", path: ["sizeGuideImageUrl"], message: "Upload a size guide image or disable the size guide." });
  }
  if (value.compareAtPriceDzd !== null && value.compareAtPriceDzd <= value.priceDzd) {
    context.addIssue({ code: "custom", path: ["compareAtPriceDzd"], message: "Compare-at price must be higher than price." });
  }
});

export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
