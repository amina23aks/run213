import { verifyAdminRequest } from "@/lib/admin-auth";
import { favoriteAggregateId, type FavoriteKind } from "@/lib/favorites/aggregate";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const SCAN_LIMIT = 200;
const PAGE_SIZE = 20;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const search = (url.searchParams.get("search") ?? "").trim().toLocaleLowerCase();
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
    const db = getAdminDb();
    const snapshot = await db.collection("favoriteAggregates").limit(SCAN_LIMIT).get();
    const aggregates = snapshot.docs.flatMap((doc) => {
      const itemType = doc.get("type");
      const itemId = doc.get("itemId");
      const count = doc.get("count");
      if ((itemType !== "product" && itemType !== "look") || typeof itemId !== "string" || !itemId || itemId.includes("/") || typeof count !== "number" || !Number.isFinite(count) || count < 0 || doc.id !== favoriteAggregateId(itemType, itemId)) {
        console.warn("[admin-favorites] skipped malformed aggregate", { aggregateId: doc.id });
        return [];
      }
      return [{ id: doc.id, itemId, type: itemType as FavoriteKind, count: Math.trunc(count) }];
    }).sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));
    const ranked = aggregates.filter((item) => item.count > 0);
    const refs = ranked.map((item) => db.collection(item.type === "product" ? "products" : "looks").doc(item.itemId));
    const itemDocs = refs.length ? await db.getAll(...refs) : [];
    const rankedItems = ranked.map((item, index) => {
      const data = itemDocs[index]?.data();
      const images = Array.isArray(data?.images) ? data.images : [];
      const firstImage = images[0] && typeof images[0] === "object" ? images[0] as Record<string, unknown> : null;
      return { ...item, name: typeof data?.name === "string" ? data.name : "Unavailable item", slug: typeof data?.slug === "string" ? data.slug : null, status: typeof data?.status === "string" ? data.status : "unavailable", imageUrl: typeof firstImage?.url === "string" ? firstImage.url : null };
    });
    const enriched = rankedItems.filter((item) => (type !== "product" && type !== "look" || item.type === type) && (!search || item.name.toLocaleLowerCase().includes(search)));
    const productSaves = aggregates.filter((item) => item.type === "product").reduce((sum, item) => sum + item.count, 0);
    const lookSaves = aggregates.filter((item) => item.type === "look").reduce((sum, item) => sum + item.count, 0);
    return Response.json({ summary: { productSaves, lookSaves, totalSaves: productSaves + lookSaves, mostSavedItem: rankedItems[0]?.name ?? null }, items: enriched.slice(offset, offset + PAGE_SIZE), nextOffset: offset + PAGE_SIZE < enriched.length ? offset + PAGE_SIZE : null, boundedTo: SCAN_LIMIT }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[admin-favorites] request failed", error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError" });
    return Response.json({ error: "Favorites insights are temporarily unavailable." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
