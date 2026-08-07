import { FieldPath } from "firebase-admin/firestore";
import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return adminJsonError("Unauthorized", 401);
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const collection = getAdminDb().collection("wishlistSignups");
  const [count, snapshot] = await Promise.all([
    collection.count().get(),
    collection.orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(250).get(),
  ]);
  const subscribers = snapshot.docs.map((doc) => ({
    id: doc.id,
    email: String(doc.get("email") ?? ""),
    joinedAt: doc.get("createdAt")?.toDate?.().toISOString?.() ?? null,
    status: typeof doc.get("status") === "string" ? doc.get("status") : null,
  })).filter((item) => !search || item.email.includes(search));
  return Response.json({ total: count.data().count, subscribers: subscribers.slice(offset, offset + PAGE_SIZE), nextOffset: offset + PAGE_SIZE < subscribers.length ? offset + PAGE_SIZE : null });
}

const deleteSchema = z.object({ id: z.string().min(1).max(400) });
export async function DELETE(request: Request) {
  if (!await verifyAdminRequest(request)) return adminJsonError("Unauthorized", 401);
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJsonError("Invalid subscriber.", 400);
  await getAdminDb().collection("wishlistSignups").doc(parsed.data.id).delete();
  return new Response(null, { status: 204 });
}
