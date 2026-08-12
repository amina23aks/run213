import { AggregateField, FieldPath } from "firebase-admin/firestore";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { favoriteAggregateId, type FavoriteKind } from "@/lib/favorites/aggregate";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
type Cursor = { count: number; id: string };

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);
  if (!adminVerification.ok) return adminVerification.response;
  try {
    const url = new URL(request.url);
    const requestedType = url.searchParams.get("type");
    const type = requestedType === "product" || requestedType === "look" ? requestedType : null;
    const cursor = parseCursor(url.searchParams.get("cursor"));
    const db = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection("favoriteAggregates");
    if (type) query = query.where("type", "==", type);
    query = query.orderBy("count", "desc").orderBy(FieldPath.documentId(), "asc").limit(PAGE_SIZE + 1);
    if (cursor) query = query.startAfter(cursor.count, cursor.id);

    const [snapshot, productTotal, lookTotal] = await Promise.all([
      query.get(),
      db.collection("favoriteAggregates").where("type", "==", "product").aggregate({ saves: AggregateField.sum("count") }).get(),
      db.collection("favoriteAggregates").where("type", "==", "look").aggregate({ saves: AggregateField.sum("count") }).get(),
    ]);
    const pageDocs = snapshot.docs.slice(0, PAGE_SIZE);
    const aggregates = pageDocs.flatMap((doc) => {
      const itemType = doc.get("type"), itemId = doc.get("itemId"), count = doc.get("count");
      if ((itemType !== "product" && itemType !== "look") || typeof itemId !== "string" || !itemId || itemId.includes("/") || typeof count !== "number" || !Number.isFinite(count) || count <= 0 || doc.id !== favoriteAggregateId(itemType, itemId)) {
        console.warn("[admin-favorites] skipped malformed aggregate", { aggregateId: doc.id }); return [];
      }
      return [{ id: doc.id, itemId, type: itemType as FavoriteKind, count: Math.trunc(count) }];
    });
    const refs = aggregates.map((item) => db.collection(item.type === "product" ? "products" : "looks").doc(item.itemId));
    const itemDocs = refs.length ? await db.getAll(...refs) : [];
    const items = aggregates.map((item, index) => {
      const data = itemDocs[index]?.data();
      const image = item.type === "look" ? data?.heroImage : Array.isArray(data?.images) ? data.images[0] : null;
      const rawImageUrl = image && typeof image === "object" ? (image as Record<string, unknown>).url : null;
      return { ...item, name: typeof data?.name === "string" ? data.name : "Unavailable item", slug: typeof data?.slug === "string" ? data.slug : null, status: typeof data?.status === "string" ? data.status : "unavailable", imageUrl: typeof rawImageUrl === "string" && rawImageUrl.trim() ? rawImageUrl : null };
    });
    const productSaves = Number(productTotal.data().saves ?? 0), lookSaves = Number(lookTotal.data().saves ?? 0);
    const last = pageDocs.at(-1);
    return Response.json({ summary: { productSaves, lookSaves, totalSaves: productSaves + lookSaves, mostSavedItem: cursor ? null : items[0]?.name ?? null }, items, nextCursor: snapshot.docs.length > PAGE_SIZE && last ? encodeCursor({ count: Number(last.get("count")), id: last.id }) : null }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[admin-favorites] request failed", error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" });
    return Response.json({ error: "Favorites insights are temporarily unavailable." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

function encodeCursor(cursor: Cursor) { return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
function parseCursor(value: string | null): Cursor | null { try { if (!value) return null; const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<Cursor>; return typeof parsed.count === "number" && Number.isFinite(parsed.count) && typeof parsed.id === "string" && parsed.id ? { count: parsed.count, id: parsed.id } : null; } catch { return null; } }
