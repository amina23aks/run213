import { FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;
  const url = new URL(request.url);
  const cursor = parseCursor(url.searchParams.get("cursor"));
  const collection = getAdminDb().collection("wishlistSignups");
  let query = collection.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(PAGE_SIZE + 1);
  if (cursor) query = query.startAfter(new Date(cursor.createdAt), cursor.id);
  const [count, snapshot] = await Promise.all([collection.count().get(), query.get()]);
  const docs = snapshot.docs.slice(0, PAGE_SIZE);
  const subscribers = docs.map((doc) => ({
    id: doc.id,
    email: String(doc.get("email") ?? ""),
    joinedAt: doc.get("createdAt")?.toDate?.().toISOString?.() ?? null,
    status: typeof doc.get("status") === "string" ? doc.get("status") : null,
  }));
  const last = docs.at(-1), lastDate = last?.get("createdAt")?.toDate?.();
  return Response.json({ total: count.data().count, subscribers, nextCursor: snapshot.docs.length > PAGE_SIZE && last && lastDate instanceof Date ? encodeCursor({ createdAt: lastDate.toISOString(), id: last.id }) : null });
}

type WishlistCursor = { createdAt: string; id: string };
function encodeCursor(cursor: WishlistCursor) { return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
function parseCursor(value: string | null): WishlistCursor | null { try { if (!value) return null; const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<WishlistCursor>; return typeof parsed.createdAt === "string" && Number.isFinite(Date.parse(parsed.createdAt)) && typeof parsed.id === "string" && parsed.id ? { createdAt: parsed.createdAt, id: parsed.id } : null; } catch { return null; } }

const deleteSchema = z.object({ id: z.string().min(1).max(400) });
export async function DELETE(request: Request) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJsonError("Invalid subscriber.", 400);
  await getAdminDb().collection("wishlistSignups").doc(parsed.data.id).delete();
  return new Response(null, { status: 204 });
}
