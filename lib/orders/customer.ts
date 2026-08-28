import "server-only";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { verifyCustomerAccessToken } from "@/lib/orders/accessToken";
import { customerDeliveryEditSchema, normalizePhone } from "@/lib/orders/validation";
import { shippingCalculator } from "@/lib/orders/shipping";
import { normalizeProductColors } from "@/lib/productColors";
import type { VerifiedCustomer } from "@/lib/customer-auth";
import type { OrderStatus } from "@/types/order";

const ORDERS = "orders";
const PRODUCTS = "products";
const LIMIT = 10;
const STATUSES: OrderStatus[] = ["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"];

type GuestAccess = { orderId: string; token: string };
type ClaimInput = { orderId?: unknown; token?: unknown };
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

export async function claimGuestOrders(auth: VerifiedCustomer, pairs: ClaimInput[]) {
  const db = getAdminDb();
  const seen = new Set<string>();
  const sanitized = pairs.flatMap((pair) => {
    if (typeof pair.orderId !== "string" || typeof pair.token !== "string" || seen.has(pair.orderId)) return [];
    seen.add(pair.orderId);
    return [{ orderId: pair.orderId, token: pair.token }];
  }).slice(0, 12);
  const results = await Promise.all(sanitized.map(async ({ orderId, token }) => {
    const ref = db.collection(ORDERS).doc(orderId);
    return db.runTransaction(async (transaction): Promise<"claimed" | "stale"> => {
      const snap = await transaction.get(ref);
      if (!snap.exists) return "stale";
      const data = snap.data() ?? {};
      if (typeof data.customerUserId === "string" && data.customerUserId.length > 0) return "stale";
      if (!verifyCustomerAccessToken(token, typeof data.customerAccessTokenHash === "string" ? data.customerAccessTokenHash : null)) return "stale";
      transaction.update(ref, { customerUserId: auth.uid, customerAccessTokenHash: null, updatedAt: new Date().toISOString(), updatedAtTimestamp: FieldValue.serverTimestamp() });
      return "claimed";
    });
  }));
  return {
    claimedOrderIds: sanitized.flatMap(({ orderId }, index) => results[index] === "claimed" ? [orderId] : []),
    staleOrderIds: sanitized.flatMap(({ orderId }, index) => results[index] === "stale" ? [orderId] : []),
  };
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
  const parsed = customerDeliveryEditSchema.safeParse(input);
  if (!parsed.success) throw new CustomerOrderError("validation_failed", "Check the highlighted delivery details.", 400, Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])));
  const customer = { fullName: parsed.data.fullName, phone: parsed.data.phone };
  const deliveryPatch = { wilaya: parsed.data.wilaya, address: parsed.data.address, deliveryMode: parsed.data.deliveryMode, notes: parsed.data.notes?.trim() || null };
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref); if (!snap.exists) throw new CustomerOrderError("not_found", "Order not found.", 404);
    const data = snap.data() ?? {}; authorize(data, auth, token);
    if (data.status !== "pending") throw new CustomerOrderError("not_pending", "This order can no longer be edited.", 409);
    const itemsSubtotalDzd = canonicalMerchandiseSubtotal(data);
    const quote = await shippingCalculator.quote({ ...deliveryPatch, commune: null });
    const totals = { ...obj(data.totals), itemsSubtotalDzd, shippingDzd: quote.amountDzd, totalDzd: itemsSubtotalDzd + quote.amountDzd, deliveryPricingStatus: quote.status };
    transaction.update(ref, { customer: { ...obj(data.customer), ...customer, phoneNormalized: normalizePhone(customer.phone) }, delivery: { ...obj(data.delivery), ...deliveryPatch }, totals, customerLookup: { ...obj(data.customerLookup), phoneNormalized: normalizePhone(customer.phone) }, updatedAt: new Date().toISOString(), updatedAtTimestamp: FieldValue.serverTimestamp(), statusHistory: FieldValue.arrayUnion({ status: "pending", at: new Date().toISOString(), actor: "customer", note: "Delivery details updated" }) });
  });
  return getCustomerOrder(orderId, auth, token);
}

function canonicalMerchandiseSubtotal(data: FirebaseFirestore.DocumentData): number {
  const stored = num(obj(data.totals).itemsSubtotalDzd);
  if (stored !== null && Number.isInteger(stored) && stored >= 0) return stored;
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) throw new CustomerOrderError("subtotal_unavailable", "This legacy order cannot be safely repriced. Contact support.", 409);
  let subtotal = 0;
  for (const raw of items) {
    const item = obj(raw); const lineTotal = num(item.lineTotalDzd);
    if (lineTotal !== null && Number.isInteger(lineTotal) && lineTotal >= 0) { subtotal += lineTotal; continue; }
    if (opt(item.lookGroupId) || opt(item.lookId)) throw new CustomerOrderError("subtotal_unavailable", "This legacy order cannot be safely repriced. Contact support.", 409);
    const unitPrice = num(item.unitPriceDzd); const quantity = num(item.quantity);
    if (unitPrice === null || quantity === null || !Number.isInteger(unitPrice) || unitPrice < 0 || !Number.isInteger(quantity) || quantity < 1) throw new CustomerOrderError("subtotal_unavailable", "This legacy order cannot be safely repriced. Contact support.", 409);
    subtotal += unitPrice * quantity;
  }
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) throw new CustomerOrderError("subtotal_unavailable", "This legacy order cannot be safely repriced. Contact support.", 409);
  return subtotal;
}

export async function getCustomerOrderItemOptions(orderId: string, auth: VerifiedCustomer | null, token: string | null, itemIndexRaw: number) {
  const db = getAdminDb(); const snap = await db.collection(ORDERS).doc(orderId).get();
  if (!snap.exists) throw new CustomerOrderError("not_found", "Order not found.", 404);
  const data = snap.data() ?? {}; authorize(data, auth, token);
  const itemIndex = Math.trunc(itemIndexRaw); const items = Array.isArray(data.items) ? data.items : []; const item = obj(items[itemIndex]); const productId = opt(item.productId);
  if (itemIndex < 0 || !productId) throw new CustomerOrderError("not_found", "Order item not found.", 404);
  const productSnap = await db.collection(PRODUCTS).doc(productId).get();
  if (!productSnap.exists) throw new CustomerOrderError("product_unavailable", "This product is no longer available for option edits.", 409);
  const product = productSnap.data() ?? {};
  return {
    itemIndex,
    productId,
    sizes: (Array.isArray(product.sizes) ? product.sizes : []).flatMap((size) => { const label = opt(obj(size).label); return label ? [{ label, available: true }] : []; }),
    colors: normalizeProductColors(product.colors).map((color) => ({ id: color.id, name: color.name, hex: color.hex, available: true })),
    selectedSize: opt(item.selectedSize),
    selectedColorId: opt(item.selectedColorId) ?? normalizeProductColors(product.colors).find((color) => color.name === opt(item.selectedColor))?.id ?? null,
    selectedColor: opt(item.selectedColor),
  };
}

export async function editCustomerOrderItemOptions(orderId: string, auth: VerifiedCustomer | null, token: string | null, input: Record<string, unknown>) {
  const db = getAdminDb(); const ref = db.collection(ORDERS).doc(orderId);
  const itemIndex = typeof input.itemIndex === "number" ? Math.trunc(input.itemIndex) : -1;
  const selectedSize = opt(input.selectedSize); const selectedColorId = opt(input.selectedColorId); const legacySelectedColor = opt(input.selectedColor);
  if (itemIndex < 0 || !selectedSize || (!selectedColorId && !legacySelectedColor)) throw new CustomerOrderError("validation_failed", "Choose a valid size and color.", 400);
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref); if (!snap.exists) throw new CustomerOrderError("not_found", "Order not found.", 404);
    const data = snap.data() ?? {}; authorize(data, auth, token);
    if (data.status !== "pending") throw new CustomerOrderError("not_pending", "This order can no longer be edited.", 409);
    const items = Array.isArray(data.items) ? data.items.map((item) => ({ ...obj(item) })) : [];
    const item = items[itemIndex]; if (!item || !opt(item.productId)) throw new CustomerOrderError("not_found", "Order item not found.", 404);
    const productSnap = await transaction.get(db.collection(PRODUCTS).doc(opt(item.productId)!));
    if (!productSnap.exists) throw new CustomerOrderError("product_unavailable", "This product is no longer available for option edits.", 409);
    const product = productSnap.data() ?? {};
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = normalizeProductColors(product.colors);
    if (!sizes.some((size) => obj(size).label === selectedSize)) throw new CustomerOrderError("invalid_size", "Choose a valid size for this product.", 400);
    const color = selectedColorId ? colors.find((entry) => entry.id === selectedColorId) : colors.find((entry) => entry.name === legacySelectedColor);
    if (!color) throw new CustomerOrderError("invalid_color", "Choose a valid color for this product.", 400);
    items[itemIndex] = { ...item, selectedSize, selectedColorId: color.id, selectedColor: color.name, selectedColorHex: color.hex };
    transaction.update(ref, { items, updatedAt: new Date().toISOString(), updatedAtTimestamp: FieldValue.serverTimestamp(), statusHistory: FieldValue.arrayUnion({ status: "pending", at: new Date().toISOString(), actor: "customer", note: "Item options updated" }) });
  });
  return getCustomerOrder(orderId, auth, token);
}

function authorize(data: FirebaseFirestore.DocumentData, auth: VerifiedCustomer | null, token: string | null) { if (auth && data.customerUserId === auth.uid) return; if (!auth && token && verifyCustomerAccessToken(token, typeof data.customerAccessTokenHash === "string" ? data.customerAccessTokenHash : null)) return; throw new CustomerOrderError("not_found", "Order not found.", 404); }
async function restoreStock(transaction: FirebaseFirestore.Transaction, data: FirebaseFirestore.DocumentData) { const quantities = new Map<string, number>(); for (const item of Array.isArray(data.items) ? data.items : []) if (item?.stockMode === "limited" && typeof item.productId === "string") quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + Math.max(1, Math.trunc(Number(item.quantity) || 1))); for (const [id, qty] of quantities) { const ref = getAdminDb().collection(PRODUCTS).doc(id); const snap = await transaction.get(ref); if (snap.exists) { const next = (Number(snap.get("stockQty")) || 0) + qty; transaction.update(ref, { stockQty: next, inStock: next > 0, updatedAt: FieldValue.serverTimestamp() }); } } }
function toCustomerOrder(id: string, data: FirebaseFirestore.DocumentData) { const customer = obj(data.customer), delivery = obj(data.delivery), totals = obj(data.totals); const items = (Array.isArray(data.items) ? data.items : []).map((raw) => { const item = obj(raw); return { productId: opt(item.productId), slug: opt(item.slug), name: opt(item.name) ?? "Product", image: opt(item.image), selectedSize: opt(item.selectedSize), selectedColorId: opt(item.selectedColorId), selectedColor: opt(item.selectedColor), selectedColorHex: opt(item.selectedColorHex), quantity: num(item.quantity) ?? 0, unitPriceDzd: num(item.unitPriceDzd), lineTotalDzd: num(item.lineTotalDzd), lookName: opt(item.lookName), lookGroupId: opt(item.lookGroupId), lookId: opt(item.lookId), lookSlug: opt(item.lookSlug), lookImage: opt(item.lookImage), lookPricingMode: opt(item.lookPricingMode), lookPriceDzd: num(item.lookPriceDzd), lookSavingsDzd: num(item.lookSavingsDzd), allocatedRevenueDzd: num(item.allocatedRevenueDzd) }; }); return { id, orderNumber: opt(data.orderNumber) ?? id, status: parseStatus(data.status), statusExplanation: explanation(data.status), createdAt: iso(data.createdAtTimestamp) ?? iso(data.createdAt), paymentMethod: opt(data.paymentMethod) ?? "cash_on_delivery", paymentStatus: opt(data.paymentStatus) ?? "cod_pending", customer: { fullName: opt(customer.fullName), phone: opt(customer.phone), email: opt(customer.email) }, delivery: { wilaya: opt(delivery.wilaya), commune: opt(delivery.commune), address: opt(delivery.address), deliveryMode: opt(delivery.deliveryMode), notes: opt(delivery.notes) }, items, itemCount: items.reduce((t, i) => t + i.quantity, 0), thumbnail: items[0]?.image ?? null, totals: { itemsSubtotalDzd: num(totals.itemsSubtotalDzd), shippingDzd: num(totals.shippingDzd), totalDzd: num(totals.totalDzd) }, statusHistory: (Array.isArray(data.statusHistory) ? data.statusHistory : []).flatMap(history) }; }
function history(raw: unknown) { const e = obj(raw); const note = opt(e.note); if (note === "Order created by server API." || opt(e.actor) === "system" && !note) return []; return [{ status: parseStatus(e.status), at: iso(e.at), note: note && !/server API|system|admin@|firebase|idempotency/i.test(note) ? note : null }]; }
function parseStatus(value: unknown): OrderStatus { return typeof value === "string" && STATUSES.includes(value as OrderStatus) ? value as OrderStatus : "pending"; }
function explanation(status: unknown) { return status === "pending" ? "We received your order and will confirm it before shipping." : status === "confirmed" ? "Your order is confirmed and being prepared." : status === "shipped" ? "Your order is on the way." : status === "delivered" ? "Your order was delivered." : status === "cancelled" ? "This order was cancelled." : status === "returned" ? "This order was returned." : "Order status updated."; }
function str(v: unknown) { return typeof v === "string" ? v.trim() : ""; } function opt(v: unknown) { const s = str(v); return s || null; } function num(v: unknown) { return typeof v === "number" && Number.isFinite(v) ? v : null; } function obj(v: unknown): Record<string, unknown> { return typeof v === "object" && v !== null ? v as Record<string, unknown> : {}; } function iso(v: unknown) { if (typeof v === "string") return v; if (obj(v).toDate instanceof Function) return (obj(v).toDate as () => Date)().toISOString(); return null; }
function encodeCursor(doc: FirebaseFirestore.QueryDocumentSnapshot) { const d = doc.get("createdAtTimestamp")?.toDate?.(); return Buffer.from(JSON.stringify({ createdAtMillis: d instanceof Date ? d.getTime() : Date.now(), id: doc.id }), "utf8").toString("base64url"); }
function parseCursor(value: string | null): Cursor | null { try { const x = value ? JSON.parse(Buffer.from(value, "base64url").toString("utf8")) : null; return typeof x?.createdAtMillis === "number" && typeof x.id === "string" ? x : null; } catch { return null; } }
export class CustomerOrderError extends Error { constructor(public code: string, message: string, public status: number, public fieldErrors?: Record<string, string>) { super(message); } }
