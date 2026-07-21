import { NextResponse } from "next/server";
import { z } from "zod";
import { toProductCardView } from "@/constants/products";
import { getActiveLooksByIds } from "@/lib/firestore/looks";
import { getActiveProductsByIds } from "@/lib/firestore/products";
import { getLookHref } from "@/lib/look-urls";

const MAX_IDS_PER_TYPE = 80;
const favoriteIdSchema = z.string().trim().min(1).max(180).regex(/^[A-Za-z0-9_-]+$/);
const resolveSchema = z.object({
  productIds: z.array(favoriteIdSchema).max(MAX_IDS_PER_TYPE).default([]),
  lookIds: z.array(favoriteIdSchema).max(MAX_IDS_PER_TYPE).default([]),
}).strict();

function unique(values: string[]) {
  return [...new Set(values)];
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof resolveSchema>;

  try {
    parsed = resolveSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid favorites request." }, { status: 400 });
  }

  const productIds = unique(parsed.productIds);
  const lookIds = unique(parsed.lookIds);

  try {
    const [productsById, looksById] = await Promise.all([
      getActiveProductsByIds(productIds),
      getActiveLooksByIds(lookIds),
    ]);

    return NextResponse.json({
      products: productIds.flatMap((id) => {
        const product = productsById.get(id);
        return product ? [{ id: product.id, card: toProductCardView(product), sourceProduct: { ...product, costPriceDzd: null } }] : [];
      }),
      looks: lookIds.flatMap((id) => {
        const look = looksById.get(id);
        return look ? [{
          id: look.id,
          href: getLookHref(look),
          name: look.name,
          description: look.description,
          image: look.heroImage,
          priceDzd: look.priceDzd,
          compareAtPriceDzd: look.compareAtPriceDzd,
          discountPercent: look.discountPercent ?? 0,
          isPromo: look.isPromo === true,
          productCount: look.productIds.length,
        }] : [];
      }),
      unavailableProductIds: productIds.filter((id) => !productsById.has(id)),
      unavailableLookIds: lookIds.filter((id) => !looksById.has(id)),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("[favorites] resolve failed", error);
    return NextResponse.json({ error: "Favorites could not be loaded right now." }, { status: 500 });
  }
}
