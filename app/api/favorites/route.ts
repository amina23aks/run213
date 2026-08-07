import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { applyFavoriteAggregate } from "@/lib/favorites/aggregate";

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

  const db = getAdminDb();
  const { type, itemId, favorite } = parsed.data;
  const collection = type === "product" ? "productFavorites" : "lookFavorites";
  const favoriteRef = db.collection("users").doc(uid).collection(collection).doc(itemId);

  await db.runTransaction(async (transaction) => {
    const aggregateRef = db.collection("favoriteAggregates").doc(`${type}_${itemId}`);
    const [current, aggregate] = await transaction.getAll(favoriteRef, aggregateRef);
    if (favorite === current.exists) return;
    if (favorite) transaction.create(favoriteRef, { itemId, createdAt: FieldValue.serverTimestamp() });
    else transaction.delete(favoriteRef);
    if (favorite || aggregate.exists && Number(aggregate.get("count") ?? 0) > 0) applyFavoriteAggregate(transaction, db, type, itemId, favorite ? 1 : -1);
  });

  return Response.json({ favorite });
}
