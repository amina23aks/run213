import { AggregateField, FieldPath } from "firebase-admin/firestore";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { favoriteAggregateId, type FavoriteKind } from "@/lib/favorites/aggregate";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const SCAN_LIMIT = 200;
const PAGE_SIZE = 20;

export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return adminJsonError("Unauthorized", 401);
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const search = (url.searchParams.get("search") ?? "").trim().toLocaleLowerCase();
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const db = getAdminDb();
  const aggregates = db.collection("favoriteAggregates");

  const [totals, productTotal, lookTotal, ranked] = await Promise.all([
    aggregates.aggregate({ total: AggregateField.sum("count") }).get(),
    aggregates.where("type", "==", "product").aggregate({ total: AggregateField.sum("count") }).get(),
    aggregates.where("type", "==", "look").aggregate({ total: AggregateField.sum("count") }).get(),
    aggregates.orderBy("count", "desc").orderBy(FieldPath.documentId(), "asc").limit(SCAN_LIMIT).get(),
  ]);

  const candidates = ranked.docs
    .map((doc) => ({ id: doc.id, itemId: String(doc.get("itemId") ?? ""), type: doc.get("type") as FavoriteKind, count: Math.max(0, Number(doc.get("count") ?? 0)) }))
    .filter((item) => (item.type === "product" || item.type === "look") && item.id === favoriteAggregateId(item.type, item.itemId))
    .filter((item) => item.count > 0 && (type !== "product" && type !== "look" || item.type === type));
  const refs = candidates.map((item) => db.collection(item.type === "product" ? "products" : "looks").doc(item.itemId));
  const itemDocs = refs.length ? await db.getAll(...refs) : [];
  const enriched = candidates.map((item, index) => {
    const data = itemDocs[index]?.data();
    const images = Array.isArray(data?.images) ? data.images : [];
    const firstImage = images[0] && typeof images[0] === "object" ? images[0] as Record<string, unknown> : null;
    return {
      ...item,
      name: typeof data?.name === "string" ? data.name : "Unavailable item",
      slug: typeof data?.slug === "string" ? data.slug : null,
      status: typeof data?.status === "string" ? data.status : "unavailable",
      imageUrl: typeof firstImage?.url === "string" ? firstImage.url : null,
    };
  }).filter((item) => !search || item.name.toLocaleLowerCase().includes(search));
  const items = enriched.slice(offset, offset + PAGE_SIZE);

  return Response.json({
    summary: {
      productSaves: Number(productTotal.data().total ?? 0),
      lookSaves: Number(lookTotal.data().total ?? 0),
      totalSaves: Number(totals.data().total ?? 0),
      mostSavedItem: enriched[0]?.name ?? null,
    },
    items,
    nextOffset: offset + PAGE_SIZE < enriched.length ? offset + PAGE_SIZE : null,
    boundedTo: SCAN_LIMIT,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
