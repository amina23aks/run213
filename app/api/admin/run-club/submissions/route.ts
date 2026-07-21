import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAlgiersMonthKey } from "@/lib/run-club/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const querySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), limit: z.coerce.number().int().min(1).max(20).default(20), cursor: z.string().optional() });

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return Response.json({ ok: false, code: "validation_failed", message: "Invalid filters." }, { status: 400 });
  const monthKey = parsed.data.month ?? getAlgiersMonthKey();
  const status = parsed.data.status ?? "pending";
  let query = getAdminDb().collection("runClubSubmissions").where("monthKey", "==", monthKey).where("status", "==", status).orderBy("createdAt", "desc").limit(parsed.data.limit + 1);
  const cursorDate = parseCursor(parsed.data.cursor);
  if (cursorDate) query = query.startAfter(cursorDate);
  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, parsed.data.limit);
  const submissions = docs.map((doc) => ({ id: doc.id, ...serializeAdminSubmission(doc.data()) }));
  const nextCursor = snapshot.docs.length > parsed.data.limit ? encodeCursor(docs.at(-1)?.get("createdAt")) : null;
  return Response.json({ ok: true, submissions, nextCursor });
}

function serializeAdminSubmission(data: FirebaseFirestore.DocumentData) {
  return { name: data.name ?? "", contactType: data.contactType ?? "", contactValue: data.contactValue ?? "", instagram: data.instagram ?? null, wilaya: data.wilaya ?? null, caption: data.caption ?? null, publicName: data.publicName ?? data.name ?? "", publicCaption: data.publicCaption ?? data.caption ?? null, publicWilaya: data.publicWilaya ?? data.wilaya ?? null, monthKey: data.monthKey, status: data.status, consentAccepted: data.consentAccepted === true, proofImage: data.proofImage ?? null, createdAt: toIso(data.createdAt), approvedAt: toIso(data.approvedAt), rejectedAt: toIso(data.rejectedAt), rejectionReason: data.rejectionReason ?? null };
}
function toIso(value: unknown) { return value instanceof Timestamp ? value.toDate().toISOString() : null; }
function encodeCursor(value: unknown) { return value instanceof Timestamp ? Buffer.from(value.toDate().toISOString(), "utf8").toString("base64url") : null; }
function parseCursor(value?: string) { if (!value) return null; try { return Timestamp.fromDate(new Date(Buffer.from(value, "base64url").toString("utf8"))); } catch { return null; } }
