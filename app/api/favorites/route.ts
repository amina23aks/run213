import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { applyFavoriteAggregate, favoriteAggregateId, nextFavoriteAggregateCount } from "@/lib/favorites/aggregate";
import { checkFavoriteMutationRateLimits, getFavoriteClientIp } from "@/lib/favorites/rateLimit";
import { DurableRateLimitUnavailableError } from "@/lib/rate-limit";

const inputSchema = z.object({
  type: z.enum(["product", "look"]),
  itemId: z.string().trim().min(1).max(180).regex(/^[A-Za-z0-9_-]+$/),
  favorite: z.boolean(),
});

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "Authentication required." }, { status: 401 });

  let uid: string;
  try {
    uid = (await getAdminAuth().verifyIdToken(token)).uid;
  } catch {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid favorite request." }, { status: 400 });

  try {
    const rateLimit = await checkFavoriteMutationRateLimits({ uid, ip: getFavoriteClientIp(request) });
    if (!rateLimit.allowed) return rateLimited(rateLimit.reset);
  } catch (error) {
    if (error instanceof DurableRateLimitUnavailableError) {
      return Response.json({ error: "Favorites are temporarily unavailable." }, { status: 503 });
    }
    return Response.json({ error: "Favorites are temporarily unavailable." }, { status: 503 });
  }

  const db = getAdminDb();
  const { type, itemId, favorite } = parsed.data;
  const collection = type === "product" ? "productFavorites" : "lookFavorites";
  const favoriteRef = db.collection("users").doc(uid).collection(collection).doc(itemId);

  try {
    await db.runTransaction(async (transaction) => {
      const aggregateRef = db.collection("favoriteAggregates").doc(favoriteAggregateId(type, itemId));
      const targetRef = db.collection(type === "product" ? "products" : "looks").doc(itemId);
      if (favorite) {
        const [target, current, aggregate] = await transaction.getAll(targetRef, favoriteRef, aggregateRef);
        // The canonical document is read in the same transaction as the write, so an
        // inactive or deleted target can never create a favorite or aggregate entry.
        if (!target.exists || !isAvailableFavoriteTarget(type, target.data())) throw new ItemUnavailableError();
        if (current.exists) return;
        transaction.create(favoriteRef, { itemId, createdAt: FieldValue.serverTimestamp() });
        applyFavoriteAggregate(transaction, db, type, itemId, nextFavoriteAggregateCount(aggregate.get("count"), 1));
        return;
      }

      // Removal deliberately does not read the target: owners can clean up stale
      // favorites after an item is archived or deleted.
      const [current, aggregate] = await transaction.getAll(favoriteRef, aggregateRef);
      if (!current.exists) return;
      transaction.delete(favoriteRef);
      applyFavoriteAggregate(transaction, db, type, itemId, nextFavoriteAggregateCount(aggregate.get("count"), -1));
    });
  } catch (error) {
    if (error instanceof ItemUnavailableError) {
      return Response.json({ error: "Item is unavailable.", code: "ITEM_UNAVAILABLE" }, { status: 409 });
    }
    if (process.env.NODE_ENV !== "production") console.error("[favorites] mutation failed", error);
    return Response.json({ error: "Favorites are temporarily unavailable." }, { status: 503 });
  }

  return Response.json({ favorite });
}

class ItemUnavailableError extends Error {}

function isAvailableFavoriteTarget(type: "product" | "look", data: Record<string, unknown> | undefined): boolean {
  if (!data || data.status !== "active" || !isNonEmptyString(data.slug) || !isNonEmptyString(data.name)) return false;
  if (type === "look") {
    return isNonEmptyString(data.collectionId)
      && isNonEmptyString(data.collectionSlug)
      && isImage(data.heroImage)
      && isPositiveNumber(data.priceDzd);
  }
  const hasCanonicalProductFields = isProductCategory(data.category)
    && isPositiveNumber(data.priceDzd)
    && Array.isArray(data.images) && data.images.length > 0
    && Array.isArray(data.colors) && data.colors.length > 0;
  const hasStock = data.inStock !== false
    && (data.stockMode !== "limited" || (typeof data.stockQty === "number" && data.stockQty > 0));
  return hasCanonicalProductFields && hasStock;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isImage(value: unknown): boolean {
  return typeof value === "object" && value !== null
    && isNonEmptyString((value as Record<string, unknown>).url)
    && isNonEmptyString((value as Record<string, unknown>).alt);
}

function isProductCategory(value: unknown): boolean {
  return value === "tshirts" || value === "pants" || value === "hoodies" || value === "accessories";
}

function rateLimited(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
}
