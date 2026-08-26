import { createHash } from "node:crypto";
import { z } from "zod";

const categories = ["tshirts", "pants", "hoodies", "accessories"];
const stockModes = ["unlimited", "limited"];
const text = z.string().trim().min(1);
const stagingColorSchema = z.object({
  id: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: text.max(60),
  hex: text.regex(/^#[0-9a-fA-F]{6}$/),
  images: z.array(text).min(1),
}).strict();

export const stagingProductSchema = z.object({
  name: text.max(120),
  slug: text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.enum(categories),
  description: text.max(2000),
  basePriceDzd: z.number().int().positive().max(1_000_000),
  costPriceDzd: z.number().int().positive().max(1_000_000),
  stockMode: z.enum(stockModes),
  stockQty: z.number().int().min(0).max(100_000).nullable().optional(),
  sizes: z.array(text.max(20)).min(1).max(12),
  colors: z.array(stagingColorSchema).min(1).max(12),
}).strict().superRefine((product, context) => {
  if (product.stockMode === "limited" && product.stockQty == null) {
    context.addIssue({ code: "custom", path: ["stockQty"], message: "stockQty is required for limited stock" });
  }
  const imageCount = product.colors.reduce((total, color) => total + color.images.length, 0);
  if (imageCount > 8) context.addIssue({ code: "custom", path: ["colors"], message: "at most 8 images are allowed by the canonical Admin Product schema" });
  const colorIds = product.colors.map((color) => color.id);
  if (new Set(colorIds).size !== colorIds.length) context.addIssue({ code: "custom", path: ["colors"], message: "color ids must be unique" });
});

export const stagingCatalogSchema = z.array(z.unknown()).min(1);

export function parseCloudinaryPublicId(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;
  const marker = "/image/upload/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return null;
  const segments = url.pathname.slice(markerIndex + marker.length).split("/").filter(Boolean);
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  const assetSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;
  if (!assetSegments.length) return null;
  const decoded = assetSegments.map((segment) => decodeURIComponent(segment));
  decoded[decoded.length - 1] = decoded.at(-1).replace(/\.[a-zA-Z0-9]+$/, "");
  return decoded.every(Boolean) ? decoded.join("/") : null;
}

function imageId(slug, publicId, index) {
  return `${slug}-${index + 1}-${createHash("sha256").update(publicId).digest("hex").slice(0, 10)}`;
}

function referencedColorIds(existing, references = []) {
  const ids = new Set(references);
  for (const image of Array.isArray(existing?.images) ? existing.images : []) if (image?.colorId) ids.add(image.colorId);
  return ids;
}

export function mapCanonicalColors(stagingColors, existing, externalColorIds = []) {
  const protectedIds = referencedColorIds(existing, externalColorIds);
  const existingColors = Array.isArray(existing?.colors) ? existing.colors : [];
  const used = new Set();
  const idMap = new Map();
  const colors = stagingColors.map((color) => {
    const normalizedHex = color.hex.toUpperCase();
    const match = existingColors.find((candidate) => !used.has(candidate.id) &&
      (candidate.id === color.id || candidate.name?.trim().toLocaleLowerCase() === color.name.toLocaleLowerCase() || candidate.hex?.toUpperCase() === normalizedHex));
    const id = match?.id ?? color.id;
    if (match) used.add(match.id);
    if (protectedIds.has(color.id) && id !== color.id) throw new Error(`color id ${color.id} is referenced and cannot be remapped`);
    idMap.set(color.id, id);
    return { id, name: color.name, hex: normalizedHex };
  });
  const resultingIds = new Set(colors.map((color) => color.id));
  for (const protectedId of protectedIds) {
    if (existingColors.some((color) => color.id === protectedId) && !resultingIds.has(protectedId)) {
      throw new Error(`referenced existing color id ${protectedId} would be removed`);
    }
  }
  return { colors, idMap };
}

export function toCanonicalPatch(product, existing = null, externalColorIds = []) {
  const { colors, idMap } = mapCanonicalColors(product.colors, existing, externalColorIds);
  let imageIndex = 0;
  const images = product.colors.flatMap((color) => color.images.map((url, colorImageIndex) => {
    const publicId = parseCloudinaryPublicId(url);
    if (!publicId) throw new Error(`invalid Cloudinary URL: ${url}`);
    const index = imageIndex++;
    return { id: imageId(product.slug, publicId, index), publicId, url, alt: `${product.name} — ${color.name} ${colorImageIndex + 1}`, colorId: idMap.get(color.id), isPrimary: index === 0, sortOrder: index };
  }));
  return {
    name: product.name, slug: product.slug, description: product.description, category: product.category,
    basePriceDzd: product.basePriceDzd, priceDzd: product.basePriceDzd, costPriceDzd: product.costPriceDzd,
    stockMode: product.stockMode, stockQty: product.stockMode === "limited" ? product.stockQty : null,
    inStock: product.stockMode === "unlimited" || product.stockQty > 0,
    sizes: product.sizes.map((label) => ({ label })), colors, images,
  };
}

export function canonicalCreate(product) {
  return {
    ...toCanonicalPatch(product), status: "draft", compareAtPriceDzd: null, discountPercent: 0,
    isPromo: false, featured: false, sizeGuideEnabled: false, sizeGuideImageUrl: null,
    sizeGuideImagePublicId: null, dropSlug: null, showInDrop001: false, showInFeaturedDrop: false,
    showInShopTheLook: false, featuredSortOrder: null, lookGroupSlug: null,
  };
}

export function validateCatalog(input) {
  const container = stagingCatalogSchema.safeParse(input);
  if (!container.success) return { entries: [], duplicates: [], catalogIssues: container.error.issues.map(formatIssue) };
  const counts = new Map();
  for (const raw of input) if (raw && typeof raw === "object" && typeof raw.slug === "string") counts.set(raw.slug, (counts.get(raw.slug) ?? 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([slug]) => slug);
  const entries = input.map((raw, index) => {
    const parsed = stagingProductSchema.safeParse(raw);
    const slug = raw && typeof raw === "object" && typeof raw.slug === "string" ? raw.slug : `[index ${index}]`;
    const issues = parsed.success ? [] : parsed.error.issues.map(formatIssue);
    if (duplicates.includes(slug)) issues.push("slug: duplicate canonical slug");
    if (parsed.success) parsed.data.colors.forEach((color, colorIndex) => color.images.forEach((url, imageIndex) => {
      if (!parseCloudinaryPublicId(url)) issues.push(`colors.${colorIndex}.images.${imageIndex}: invalid HTTPS Cloudinary URL`);
    }));
    return { slug, product: parsed.success ? parsed.data : null, issues };
  });
  return { entries, duplicates, catalogIssues: [] };
}

function formatIssue(issue) { return `${issue.path.join(".") || "catalog"}: ${issue.message}`; }

export async function planImport(input, repository) {
  const validation = validateCatalog(input);
  const plans = [];
  for (const entry of validation.entries) {
    if (!entry.product || entry.issues.length) { plans.push({ slug: entry.slug, action: "SKIP", issues: entry.issues, imageCount: 0 }); continue; }
    const matches = await repository.findBySlug(entry.slug);
    if (matches.length > 1) { plans.push({ slug: entry.slug, action: "SKIP", issues: ["multiple existing canonical Products use this slug"], imageCount: 0 }); continue; }
    try {
      const existing = matches[0] ?? null;
      const patch = existing ? toCanonicalPatch(entry.product, existing, await repository.getReferencedColorIds(existing.id)) : canonicalCreate(entry.product);
      plans.push({ slug: entry.slug, action: existing ? "UPDATE" : "CREATE", issues: [], imageCount: patch.images.length, id: existing?.id, patch });
    } catch (error) {
      plans.push({ slug: entry.slug, action: "SKIP", issues: [error instanceof Error ? error.message : "conversion failed"], imageCount: 0 });
    }
  }
  return { total: Array.isArray(input) ? input.length : 0, duplicates: validation.duplicates, catalogIssues: validation.catalogIssues, plans };
}

export async function executePlan(report, repository, write = false) {
  if (!write) return 0;
  let writes = 0;
  for (const plan of report.plans) {
    if (plan.action === "CREATE") { await repository.create(plan.patch); writes++; }
    if (plan.action === "UPDATE") { await repository.update(plan.id, plan.patch); writes++; }
  }
  return writes;
}
