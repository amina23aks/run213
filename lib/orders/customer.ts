import "server-only";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyCustomerAccessToken } from "@/lib/orders/accessToken";
import { normalizeEmail, normalizePhone } from "@/lib/orders/validation";
import type { VerifiedCustomer } from "@/lib/customer-auth";
import type { OrderStatus } from "@/types/order";

const ORDERS = "orders";
const PRODUCTS = "products";
const LIMIT = 10;
const STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"];

type GuestAccess = { orderId: string; token: string };
type Cursor = { createdAtMillis: number; id: string };
export type CustomerOrderSafe = ReturnType<typeof toCustomerOrder>;

export async function listCustomerOrders(auth: VerifiedCustomer | null, guest: GuestAccess[], cursorRaw: string | null) {
  if (auth) {
    const cursor = parseCursor(cursorRaw);
    let query: FirebaseFirestore.Query = getAdminDb().collection(ORDERS).where("customerUserId", "==", auth.uid).orderBy("createdAtTimestamp", "desc").orderBy(FieldPath.documentId(), "desc").limit(LIMIT + 1);
    if (cursor) query = query.startAfter(new Date(cursor.createdAtMillis), cursor.id);
    const snap = await query.get();
    const docs = snap.docs.slice(0, LIMIT);
    return { orders: docs.map((doc) => toCustomerOrder(doc.id, doc.data())), nextCursor: snap.docs.length > LIMIT && docs.at(-1) ? encodeCursor(docs.at(-1)!) : null };
  }
  const reads = await Promise.all(guest.slice(0, LIMIT).map(async (access) => ({ access, snap: await getAdminDb().collection(ORDERS).doc(access.orderId).get() })));
  const orders = reads.flatMap(({ access, snap }) => snap.exists && verifyCustomerAccessToken(access.token, snap.get("customerAccessTokenHash")) ? [toCustomerOrder(snap.id, snap.data() ?? {})] : []);
  orders.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  return { orders, nextCursor: null };
}

export async function getCustomerOrder(orderId: string, auth: VerifiedCustomer | null, token: string | null) {
  const snap = await getAdminDb().collection(ORDERS).doc(orderId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  if (auth && data.customerUserId === auth.uid) return toCustomerOrder(snap.id, data);
  if (!auth && token && verifyCustomerAccessToken(token, typeof data.customerAccessTokenHash === "string" ? data.customerAccessTokenHash : null)) return toCustomerOrder(snap.id, data);
  return null;
}

export async function cancelCustomerOrder(orderId: string, auth: VerifiedCustomer | null, token: string | null) {
  const db = getAdminDb();
  const ref = db.collection(ORDERS).doc(orderId);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new CustomerOrderError("not_found", "Order not found.", 404);
    const data = snap.data() ?? {};
    authorize(data, auth, token);
    if (data.status !== "pending") throw new CustomerOrderError("not_pending", "This order can no longer be cancelled.", 409);
    if (!data.inventoryRestoredAt && !data.inventoryRestoredAtIso) await restoreStock(transaction, data);
    transaction.update(ref, { status: "cancelled", updatedAt: new Date().toISOString(), updatedAtTimestamp: FieldValue.serverTimestamp(), inventoryRestoredAt: FieldValue.serverTimestamp(), inventoryRestoredAtIso: new Date().toISOString(), inventoryRestoredBy: "customer", inventoryRestorationReason: "customer_cancelled_pending", statusHistory: FieldValue.arrayUnion({ previousStatus: "pending", status: "cancelled", at: new Date().toISOString(), actor: "customer", note: "Order cancelled" }) });
  });
  return getCustomerOrder(orderId, auth, token);
}

export async function editCustomerDelivery(orderId: string, auth: VerifiedCustomer | null, token: string | null, input: Record<string, unknown>) {
  const db = getAdminDb(); const ref = db.collection(ORDERS).doc(orderId);
  const customer = { fullName: str(input.fullName), phone: str(input.phone), email: normalizeEmail(typeof input.email === "string" ? input.email : null) };
  const delivery = { wilaya: str(input.wilaya), commune: opt(input.commune), address: str(input.address), deliveryMode: input.deliveryMode === "desk" ? "desk" : "home", notes: opt(input.notes) };
  if (!customer.fullName || !customer.phone || !delivery.wilaya || !delivery.address) throw new CustomerOrderError("validation_failed", "Required delivery details are missing.", 400);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref); if (!snap.exists) throw new CustomerOrderError("not_found", "Order not found.", 404);
    const data = snap.data() ?? {}; authorize(data, auth, token);
    if (data.status !== "pending") throw new CustomerOrderError("not_pending", "This order can no longer be edited.", 409);
    transaction.update(ref, { customer: { ...data.customer, ...customer, phoneNormalized: normalizePhone(customer.phone) }, delivery, customerLookup: { phoneNormalized: normalizePhone(customer.phone), emailNormalized: customer.email }, updatedAt: new Date().toISOString(), updatedAtTimestamp: FieldValue.serverTimestamp(), statusHistory: FieldValue.arrayUnion({ status: "pending", at: new Date().toISOString(), actor: "customer", note: "Delivery details updated" }) });
  });
  return getCustomerOrder(orderId, auth, token);
}

function authorize(data: FirebaseFirestore.DocumentData, auth: VerifiedCustomer | null, token: string | null) { if (auth && data.customerUserId === auth.uid) return; if (!auth && token && verifyCustomerAccessToken(token, typeof data.customerAccessTokenHash === "string" ? data.customerAccessTokenHash : null)) return; throw new CustomerOrderError("not_found", "Order not found.", 404); }
async function restoreStock(transaction: FirebaseFirestore.Transaction, data: FirebaseFirestore.DocumentData) { const quantities = new Map<string, number>(); for (const item of Array.isArray(data.items) ? data.items : []) if (item?.stockMode === "limited" && typeof item.productId === "string") quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + Math.max(1, Math.trunc(Number(item.quantity) || 1))); for (const [id, qty] of quantities) { const ref = getAdminDb().collection(PRODUCTS).doc(id); const snap = await transaction.get(ref); if (snap.exists) { const next = (Number(snap.get("stockQty")) || 0) + qty; transaction.update(ref, { stockQty: next, inStock: next > 0, updatedAt: FieldValue.serverTimestamp() }); } } }
function toCustomerOrder(id: string, data: FirebaseFirestore.DocumentData) { const customer = obj(data.customer), delivery = obj(data.delivery), totals = obj(data.totals); const items = (Array.isArray(data.items) ? data.items : []).map((raw) => { const item = obj(raw); return { productId: opt(item.productId), slug: opt(item.slug), name: opt(item.name) ?? "Product", image: opt(item.lookImage) ?? opt(item.image), selectedSize: opt(item.selectedSize), selectedColor: opt(item.selectedColor), selectedColorHex: colorHex(opt(item.selectedColor)), quantity: num(item.quantity) ?? 0, unitPriceDzd: num(item.unitPriceDzd), lineTotalDzd: num(item.lineTotalDzd), lookName: opt(item.lookName) }; }); return { id, orderNumber: opt(data.orderNumber) ?? id, status: parseStatus(data.status), statusExplanation: explanation(data.status), createdAt: iso(data.createdAtTimestamp) ?? iso(data.createdAt), paymentMethod: opt(data.paymentMethod) ?? "cash_on_delivery", paymentStatus: opt(data.paymentStatus) ?? "cod_pending", customer: { fullName: opt(customer.fullName), phone: opt(customer.phone), email: opt(customer.email) }, delivery: { wilaya: opt(delivery.wilaya), commune: opt(delivery.commune), address: opt(delivery.address), deliveryMode: opt(delivery.deliveryMode), notes: opt(delivery.notes) }, items, itemCount: items.reduce((t, i) => t + i.quantity, 0), thumbnail: items[0]?.image ?? null, totals: { itemsSubtotalDzd: num(totals.itemsSubtotalDzd), shippingDzd: num(totals.shippingDzd), totalDzd: num(totals.totalDzd) }, statusHistory: (Array.isArray(data.statusHistory) ? data.statusHistory : []).flatMap(history) }; }
function history(raw: unknown) { const e = obj(raw); const note = opt(e.note); if (note === "Order created by server API." || opt(e.actor) === "system" && !note) return []; return [{ status: parseStatus(e.status), at: iso(e.at), note: note && !/server API|system|admin@|firebase|idempotency/i.test(note) ? note : null }]; }
function parseStatus(value: unknown): OrderStatus { return typeof value === "string" && STATUSES.includes(value as OrderStatus) ? value as OrderStatus : "pending"; }
function explanation(status: unknown) { return status === "pending" ? "We received your order and will confirm it before shipping." : status === "confirmed" ? "Your order is confirmed and being prepared." : status === "shipped" ? "Your order is on the way." : status === "delivered" ? "Your order was delivered." : status === "cancelled" ? "This order was cancelled." : status === "returned" ? "This order was returned." : "Order status updated."; }
function colorHex(name: string | null) { const key = name?.toLowerCase() ?? ""; return key.includes("black") ? "#050505" : key.includes("white") ? "#f7f2e8" : key.includes("grey") || key.includes("gray") ? "#8a8a84" : key.includes("lime") ? "#c8ff00" : null; }
function str(v: unknown) { return typeof v === "string" ? v.trim() : ""; } function opt(v: unknown) { const s = str(v); return s || null; } function num(v: unknown) { return typeof v === "number" && Number.isFinite(v) ? v : null; } function obj(v: unknown): Record<string, unknown> { return typeof v === "object" && v !== null ? v as Record<string, unknown> : {}; } function iso(v: unknown) { if (typeof v === "string") return v; if (obj(v).toDate instanceof Function) return (obj(v).toDate as () => Date)().toISOString(); return null; }
function encodeCursor(doc: FirebaseFirestore.QueryDocumentSnapshot) { const d = doc.get("createdAtTimestamp")?.toDate?.(); return Buffer.from(JSON.stringify({ createdAtMillis: d instanceof Date ? d.getTime() : Date.now(), id: doc.id }), "utf8").toString("base64url"); }
function parseCursor(value: string | null): Cursor | null { try { const x = value ? JSON.parse(Buffer.from(value, "base64url").toString("utf8")) : null; return typeof x?.createdAtMillis === "number" && typeof x.id === "string" ? x : null; } catch { return null; } }
export class CustomerOrderError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }
