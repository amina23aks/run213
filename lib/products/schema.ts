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
  priceDzd: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().positive().max(1_000_000)),
  compareAtPriceDzd: optionalNumber.pipe(z.number().int().positive().max(1_000_000).nullable()),
  images: z.array(z.object({ url: trimmedString.min(1).max(500), alt: trimmedString.max(160).default("") })).min(1).max(8),
  colors: z.array(z.object({ name: trimmedString.min(1).max(60), hex: trimmedString.regex(/^#[0-9a-fA-F]{6}$/) })).min(1).max(12),
  sizes: z.array(z.object({ label: trimmedString.min(1).max(20) })).max(12).default([]),
  status: productStatusSchema,
  inStock: z.boolean(),
  stockMode: productStockModeSchema,
  stockQty: optionalNumber.pipe(z.number().int().min(0).max(100_000).nullable()),
  isPromo: z.boolean(),
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
  if (value.compareAtPriceDzd !== null && value.compareAtPriceDzd <= value.priceDzd) {
    context.addIssue({ code: "custom", path: ["compareAtPriceDzd"], message: "Compare-at price must be higher than price." });
  }
});

export type AdminProductInput = z.infer<typeof adminProductInputSchema>;
