import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAlgiersMonthKey } from "@/lib/run-club/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional(), status: z.enum(["pending", "approved", "rejected","edit_requested","removal_requested"]).optional(), limit: z.coerce.number().int().min(1).max(20).default(8), cursor: z.string().optional() });

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Invalid filters." }, { status: 400 });
  const monthKey = parsed.data.month ?? getAlgiersMonthKey();
  const status = parsed.data.status ?? "pending";
  const requestQueue=status==="edit_requested"||status==="removal_requested";
  let query = getAdminDb().collection("runClubSubmissions").where("monthKey", "==", monthKey).where(requestQueue?"moderationState":"status", "==", status).orderBy("createdAt", "desc").orderBy(FieldPath.documentId(), "desc").limit(parsed.data.limit + 1);
  const cursor = parseCursor(parsed.data.cursor);
  if (cursor) query = query.startAfter(cursor.createdAt, cursor.id);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, parsed.data.limit);
  const submissions = docs.map((doc) => ({ id: doc.id, ...serializeAdminSubmission(doc.data()) }));
  const last = docs.at(-1);
  const nextCursor = snapshot.docs.length > parsed.data.limit && last ? encodeCursor(last.get("createdAt"), last.id) : null;
  return Response.json({ ok: true, submissions, nextCursor });
}

function serializeAdminSubmission(data: FirebaseFirestore.DocumentData) {
  return { name: data.name ?? "", contactType: data.contactType ?? "", contactValue: data.contactValue ?? "", instagram: data.instagram ?? null, wilaya: data.wilaya ?? null, caption: data.caption ?? null, publicName: data.publicName ?? data.name ?? "", publicCaption: data.publicCaption ?? data.caption ?? null, publicWilaya: data.publicWilaya ?? data.wilaya ?? null, monthKey: data.monthKey, status: data.moderationState ?? data.status, baseStatus:data.status, pendingRevision:data.pendingRevision??null, customerUserId: typeof data.customerUserId === "string" ? data.customerUserId : null, consentAccepted: data.consentAccepted === true, proofImage: data.proofImage ?? null, createdAt: toIso(data.createdAt), approvedAt: toIso(data.approvedAt), rejectedAt: toIso(data.rejectedAt), rejectionReason: data.rejectionReason ?? null };
}
function toIso(value: unknown) { return value instanceof Timestamp ? value.toDate().toISOString() : null; }
function encodeCursor(value: unknown, id: string) { return value instanceof Timestamp ? Buffer.from(JSON.stringify({ createdAt: value.toDate().toISOString(), id }), "utf8").toString("base64url") : null; }
function parseCursor(value?: string) { if (!value) return null; try { const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { createdAt?: string; id?: string }; const date = new Date(parsed.createdAt ?? ""); return Number.isFinite(date.getTime()) && parsed.id ? { createdAt: Timestamp.fromDate(date), id: parsed.id } : null; } catch { return null; } }
