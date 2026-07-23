import "server-only";

import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { VerifiedAdmin } from "@/lib/admin-auth";
import type { OrderRecord, OrderStatus } from "@/types/order";

const ORDERS_COLLECTION = "orders";
const PRODUCTS_COLLECTION = "products";
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export const ADMIN_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled", "returned"];
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

type AdminOrderCursor = { createdAtMillis: number; id: string };
export type AdminOrderListFilters = { limit?: number; cursor?: string | null; status?: string | null; search?: string | null };
export type AdminOrderListResult = { orders: AdminOrderSummary[]; nextCursor: string | null };
export type AdminOrderSummary = ReturnType<typeof toAdminOrderSummary>;
export type AdminOrderDetail = ReturnType<typeof toAdminOrderDetail>;

export async function listAdminOrders(filters: AdminOrderListFilters): Promise<AdminOrderListResult> {
  const pageSize = clampLimit(filters.limit);
  const cursor = parseCursor(filters.cursor ?? null);
  const status = parseStatusFilter(filters.status ?? null);
  const searchToken = normalizeSearchToken(filters.search ?? "");
  let query: FirebaseFirestore.Query = getAdminDb().collection(ORDERS_COLLECTION);

  if (status) query = query.where("status", "==", status);
  if (searchToken) query = query.where("adminSearchTokens", "array-contains", searchToken);
  query = query.orderBy("createdAtTimestamp", "desc").orderBy(FieldPath.documentId(), "desc").limit(pageSize + 1);
  if (cursor) query = query.startAfter(new Date(cursor.createdAtMillis), cursor.id);

  const snapshot = await query.get();
  const docs = snapshot.docs.slice(0, pageSize);
  const orders = docs.map((doc) => toAdminOrderSummary(doc.id, doc.data()));
  const lastDoc = docs.at(-1);
  const hasMore = snapshot.docs.length > pageSize;
  return { orders, nextCursor: hasMore && lastDoc ? encodeCursor(lastDoc) : null };
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderDetail | null> {
  const snapshot = await getAdminDb().collection(ORDERS_COLLECTION).doc(orderId).get();
  return snapshot.exists ? toAdminOrderDetail(snapshot.id, snapshot.data() ?? {}) : null;
}

export async function updateAdminOrderStatus(orderId: string, nextStatus: OrderStatus, admin: VerifiedAdmin, note?: string | null): Promise<AdminOrderDetail> {
  const db = getAdminDb();
  const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);
  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) throw new AdminOrderError("not_found", "Order not found.", 404);
    const data = orderSnapshot.data() ?? {};
    const currentStatus = parseOrderStatus(data.status);
    if (!currentStatus) throw new AdminOrderError("invalid_order", "Order status is invalid.", 409);
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) throw new AdminOrderError("invalid_transition", "That status transition is not allowed.", 409);

    const updates: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      updatedAtTimestamp: FieldValue.serverTimestamp(),
      statusHistory: FieldValue.arrayUnion({ previousStatus: currentStatus, status: nextStatus, at: new Date().toISOString(), actor: "admin", adminUid: admin.uid, adminEmail: admin.email, note: note?.trim() || null }),
    };

    if (nextStatus === "cancelled" && (currentStatus === "pending" || currentStatus === "confirmed")) {
      if (!isRestored(data.inventoryRestoredAt)) {
        await restoreLimitedStock(transaction, data);
        updates.inventoryRestoredAt = FieldValue.serverTimestamp();
        updates.inventoryRestoredAtIso = new Date().toISOString();
        updates.inventoryRestoredBy = admin.email;
        updates.inventoryRestorationReason = `cancelled_from_${currentStatus}`;
      }
    }

    transaction.update(orderRef, updates);
  });
  const updated = await getAdminOrder(orderId);
  if (!updated) throw new AdminOrderError("not_found", "Order not found.", 404);
  return updated;
}

async function restoreLimitedStock(transaction: FirebaseFirestore.Transaction, data: FirebaseFirestore.DocumentData): Promise<void> {
  const quantities = new Map<string, number>();
  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    if (!isRecord(item) || item.stockMode !== "limited" || !isString(item.productId)) continue;
    const quantity = isNumber(item.quantity) ? Math.max(1, Math.trunc(item.quantity)) : 1;
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + quantity);
  }
  const db = getAdminDb();
  for (const [productId, quantity] of quantities) {
    const productRef = db.collection(PRODUCTS_COLLECTION).doc(productId);
    const snapshot = await transaction.get(productRef);
    if (!snapshot.exists) continue;
    const currentStock = snapshot.get("stockQty");
    const nextStock = (typeof currentStock === "number" && Number.isFinite(currentStock) ? currentStock : 0) + quantity;
    transaction.update(productRef, { stockQty: nextStock, inStock: nextStock > 0, updatedAt: FieldValue.serverTimestamp() });
  }
}

export class AdminOrderError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.name = "AdminOrderError"; this.code = code; this.status = status; }
}

function toAdminOrderSummary(id: string, data: FirebaseFirestore.DocumentData) {
  const items = Array.isArray(data.items) ? data.items : [];
  const customer = isRecord(data.customer) ? data.customer : {};
  const delivery = isRecord(data.delivery) ? data.delivery : {};
  const totals = isRecord(data.totals) ? data.totals : {};
  return {
    id,
    orderNumber: isString(data.orderNumber) ? data.orderNumber : id,
    createdAt: toIsoString(data.createdAtTimestamp) ?? toIsoString(data.createdAt) ?? null,
    customer: { fullName: stringOrNull(customer.fullName), phone: stringOrNull(customer.phone), email: stringOrNull(customer.email) },
    wilaya: stringOrNull(delivery.wilaya),
    itemCount: items.reduce((total, item) => total + (isRecord(item) && isNumber(item.quantity) ? item.quantity : 0), 0),
    status: parseOrderStatus(data.status) ?? "pending",
    totalDzd: numberOrNull(totals.totalDzd),
  };
}

function toAdminOrderDetail(id: string, data: FirebaseFirestore.DocumentData) {
  const summary = toAdminOrderSummary(id, data);
  const delivery = isRecord(data.delivery) ? data.delivery : {};
  const totals = isRecord(data.totals) ? data.totals : {};
  const admin = isRecord(data.admin) ? data.admin : {};
  return {
    ...summary,
    paymentMethod: stringOrNull(data.paymentMethod),
    paymentStatus: stringOrNull(data.paymentStatus),
    customer: summary.customer,
    delivery: { wilaya: stringOrNull(delivery.wilaya), commune: stringOrNull(delivery.commune), address: stringOrNull(delivery.address), deliveryMode: stringOrNull(delivery.deliveryMode), notes: stringOrNull(delivery.notes) },
    totals: { itemsSubtotalDzd: numberOrNull(totals.itemsSubtotalDzd), shippingDzd: numberOrNull(totals.shippingDzd), totalDzd: numberOrNull(totals.totalDzd), costOfGoodsDzd: numberOrNull(admin.costOfGoodsDzd), estimatedProfitDzd: numberOrNull(admin.estimatedProfitDzd) },
    items: (Array.isArray(data.items) ? data.items : []).map(toAdminOrderItem),
    statusHistory: (Array.isArray(data.statusHistory) ? data.statusHistory : []).flatMap(toStatusHistoryEntry),
    inventoryRestoredAt: toIsoString(data.inventoryRestoredAt) ?? toIsoString(data.inventoryRestoredAtIso),
  };
}

function toAdminOrderItem(item: unknown) {
  const record = isRecord(item) ? item : {};
  const admin = isRecord(record.admin) ? record.admin : {};
  return {
    productId: stringOrNull(record.productId), slug: stringOrNull(record.slug), name: stringOrNull(record.name) ?? "Product", category: stringOrNull(record.category), image: stringOrNull(record.image),
    selectedSize: stringOrNull(record.selectedSize), selectedColor: stringOrNull(record.selectedColor), quantity: numberOrNull(record.quantity) ?? 0,
    unitPriceDzd: numberOrNull(record.unitPriceDzd), lineTotalDzd: numberOrNull(record.lineTotalDzd), stockMode: stringOrNull(record.stockMode),
    lookName: stringOrNull(record.lookName), lookPricingMode: stringOrNull(record.lookPricingMode),
    unitCostDzd: numberOrNull(admin.unitCostDzd), lineCostDzd: numberOrNull(admin.lineCostDzd), estimatedLineProfitDzd: numberOrNull(admin.estimatedLineProfitDzd),
  };
}

function toStatusHistoryEntry(entry: unknown) {
  if (!isRecord(entry)) return [];
  return [{ previousStatus: stringOrNull(entry.previousStatus), status: stringOrNull(entry.status) ?? "pending", at: toIsoString(entry.at) ?? null, actor: stringOrNull(entry.actor) ?? "system", adminEmail: stringOrNull(entry.adminEmail), note: stringOrNull(entry.note) }];
}

export function buildAdminSearchTokens(order: Pick<OrderRecord, "orderNumber" | "customer">): string[] {
  const source = [order.orderNumber, order.customer.fullName, order.customer.phone, order.customer.phoneNormalized, order.customer.email].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return [...new Set(source.flatMap((value) => normalizeSearchText(value).split(" ").filter(Boolean).concat(normalizeSearchText(value).replaceAll(" ", ""))).filter((value) => value.length >= 2).slice(0, 40))];
}

function normalizeSearchToken(value: string) { return normalizeSearchText(value).replaceAll(" ", ""); }
function normalizeSearchText(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9+]+/g, " ").replace(/\s+/g, " ").trim(); }
function parseStatusFilter(value: string | null): OrderStatus | null { if (!value || value === "all") return null; return parseOrderStatus(value); }
function parseOrderStatus(value: unknown): OrderStatus | null { return value === "pending" || value === "confirmed" || value === "preparing" || value === "shipped" || value === "delivered" || value === "cancelled" || value === "returned" ? value : null; }
function isRestored(value: unknown) { return Boolean(value); }
function clampLimit(value?: number) { return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value ?? DEFAULT_LIMIT), 1), MAX_LIMIT) : DEFAULT_LIMIT; }
function encodeCursor(doc: FirebaseFirestore.QueryDocumentSnapshot) { const date = doc.get("createdAtTimestamp")?.toDate?.(); return Buffer.from(JSON.stringify({ createdAtMillis: date instanceof Date ? date.getTime() : Date.now(), id: doc.id }), "utf8").toString("base64url"); }
function parseCursor(value: string | null): AdminOrderCursor | null { if (!value) return null; try { const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminOrderCursor>; return typeof decoded.createdAtMillis === "number" && typeof decoded.id === "string" ? { createdAtMillis: decoded.createdAtMillis, id: decoded.id } : null; } catch { return null; } }
function toIsoString(value: unknown): string | null { if (typeof value === "string") return value; if (isRecord(value) && typeof value.toDate === "function") { const date = value.toDate(); return date instanceof Date ? date.toISOString() : null; } return null; }
function stringOrNull(value: unknown): string | null { return typeof value === "string" && value.trim() ? value : null; }
function numberOrNull(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function isString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
