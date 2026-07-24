import "server-only";

import { createHash } from "node:crypto";
import { createCustomerAccessToken, hashCustomerAccessToken } from "@/lib/orders/accessToken";
import type { Product, ProductCategory, ProductImage, ProductSize, ProductStockMode } from "@/types/product";
import type { CreateOrderRequest, CreateOrderResponse, DeliveryInfo, OrderItem, OrderRecord } from "@/types/order";
import { createOrderNumber } from "@/lib/orders/orderNumber";
import { shippingCalculator } from "@/lib/orders/shipping";
import { calculateLookGroupPrice } from "@/lib/lookPricing";
import { normalizeProductColors } from "@/lib/productColors";
import { normalizeEmail, normalizePhone } from "@/lib/orders/validation";
import { buildAdminSearchTokens } from "@/lib/orders/admin";

const ORDERS_COLLECTION = "orders";
const PRODUCTS_COLLECTION = "products";
const LOOKS_COLLECTION = "looks";
const IDEMPOTENCY_COLLECTION = "orderIdempotencyKeys";

export type OrderErrorCode =
  | "product_unavailable"
  | "insufficient_stock"
  | "invalid_size"
  | "invalid_color"
  | "look_unavailable"
  | "invalid_look_group"
  | "delivery_quote_failed"
  | "order_failed";

export class OrderCreationError extends Error {
  code: OrderErrorCode;
  status: number;

  constructor(code: OrderErrorCode, message: string, status = 400) {
    super(message);
    this.name = "OrderCreationError";
    this.code = code;
    this.status = status;
  }
}

type ExistingOrderResult = CreateOrderResponse & { idempotent: true };
type NewOrderResult = CreateOrderResponse & { idempotent: false };

export async function createOrder(input: CreateOrderRequest, verifiedCustomerUid?: string | null): Promise<ExistingOrderResult | NewOrderResult> {
  const [{ getAdminDb }, { FieldValue, Timestamp }] = await Promise.all([
    import("@/lib/firebase/admin"),
    import("firebase-admin/firestore"),
  ]);
  const adminDb = getAdminDb();

  const now = new Date();
  const nowIso = now.toISOString();
  const normalizedPhone = normalizePhone(input.customer.phone);
  const idempotencyHash = createIdempotencyHash(input.idempotencyKey, normalizedPhone);
  const lockRef = adminDb.collection(IDEMPOTENCY_COLLECTION).doc(idempotencyHash);
  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc();
  const orderNumber = createOrderNumber(now);
  const guestAccessToken = verifiedCustomerUid ? null : createCustomerAccessToken();
  const customerAccessTokenHash = guestAccessToken ? hashCustomerAccessToken(guestAccessToken) : null;

  const record = await adminDb.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    if (lockSnapshot.exists) {
      const lock = lockSnapshot.data() ?? {};
      const existingOrderId = typeof lock.orderId === "string" ? lock.orderId : null;
      if (existingOrderId) {
        const existingOrderSnapshot = await transaction.get(adminDb.collection(ORDERS_COLLECTION).doc(existingOrderId));
        const existingOrder = existingOrderSnapshot.data() as Partial<OrderRecord> | undefined;
        if (existingOrderSnapshot.exists && existingOrder?.orderNumber && existingOrder?.status && existingOrder?.paymentStatus && existingOrder?.totals) {
          return {
            orderId: existingOrderSnapshot.id,
            orderNumber: existingOrder.orderNumber,
            status: existingOrder.status,
            paymentStatus: existingOrder.paymentStatus,
            totals: existingOrder.totals,
            idempotent: true as const,
          };
        }
      }
      throw new OrderCreationError("order_failed", "This checkout attempt is already being processed.", 409);
    }

    const productRefs = new Map<string, FirebaseFirestore.DocumentReference>();
    const products = await readProductsForOrder(input, transaction, adminDb.collection(PRODUCTS_COLLECTION), productRefs);
    const looks = await readLooksForOrder(input, transaction, adminDb.collection(LOOKS_COLLECTION));
    const delivery = normalizeDelivery(input.delivery);
    const items = buildOrderItems(input, products, looks);
    let shippingQuote;
    try {
      shippingQuote = await shippingCalculator.quote(delivery);
    } catch {
      throw new OrderCreationError("delivery_quote_failed", "Delivery is not available for the selected details.", 400);
    }
    const itemsSubtotalDzd = items.reduce((total, item) => total + item.lineTotalDzd, 0);
    const shippingDzd = shippingQuote.amountDzd;
    const customer = {
      fullName: input.customer.fullName.trim(),
      phone: input.customer.phone.trim(),
      phoneNormalized: normalizedPhone,
      email: normalizeEmail(input.customer.email),
    };
    const order: OrderRecord = {
      id: orderRef.id,
      orderNumber,
      status: "pending",
      paymentStatus: "cod_pending",
      paymentMethod: "cash_on_delivery",
      customer,
      delivery,
      items,
      totals: {
        itemsSubtotalDzd,
        shippingDzd,
        totalDzd: itemsSubtotalDzd + shippingDzd,
        deliveryPricingStatus: shippingQuote.status,
      },
      statusHistory: [{ status: "pending", at: nowIso, actor: "system", note: "Order created by server API." }],
      customerLookup: {
        phoneNormalized: customer.phoneNormalized,
        emailNormalized: customer.email,
      },
      admin: {
        needsReview: true,
        notes: "Limited stock was validated and decremented in the order transaction where applicable.",
        ...calculateOrderAdminTotals(items),
      },
      ...(verifiedCustomerUid ? { customerUserId: verifiedCustomerUid } : { customerAccessTokenHash }),
      idempotencyKeyHash: idempotencyHash,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const adminSearchTokens = buildAdminSearchTokens(order);

    applyStockUpdates(items, products, productRefs, transaction, FieldValue.serverTimestamp());

    transaction.set(orderRef, {
      ...order,
      adminSearchTokens,
      createdAtTimestamp: Timestamp.fromDate(now),
      updatedAtTimestamp: Timestamp.fromDate(now),
    });
    transaction.create(lockRef, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      keyHash: idempotencyHash,
      phoneHash: createHash("sha256").update(normalizedPhone).digest("hex"),
      createdAt: Timestamp.fromDate(now),
      createdAtIso: nowIso,
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totals: order.totals,
      idempotent: false as const,
      ...(guestAccessToken ? { customerAccessToken: guestAccessToken } : {}),
    };
  });

  return record;
}

function createIdempotencyHash(idempotencyKey: string | null | undefined, normalizedPhone: string): string {
  const key = idempotencyKey?.trim();
  if (!key) throw new OrderCreationError("order_failed", "Checkout session is invalid. Please refresh and try again.", 400);
  return createHash("sha256").update(`order:${normalizedPhone}:${key}`).digest("hex");
}

function normalizeDelivery(delivery: CreateOrderRequest["delivery"]): DeliveryInfo {
  return {
    wilaya: delivery.wilaya.trim(),
    deliveryMode: delivery.deliveryMode,
    address: delivery.address.trim(),
    commune: delivery.commune?.trim() || null,
    notes: delivery.notes?.trim() || null,
  };
}

type ProductById = Map<string, Product>;
type LookPriceById = Map<string, { id: string; slug: string; name: string; priceDzd: number; compareAtPriceDzd: number | null; discountPercent: number; heroImage: { url: string; alt: string }; productIds: string[] }>;

type TransactionLike = {
  get: (ref: FirebaseFirestore.DocumentReference) => Promise<FirebaseFirestore.DocumentSnapshot>;
};

async function readProductsForOrder(
  input: CreateOrderRequest,
  transaction: TransactionLike,
  productsCollection: FirebaseFirestore.CollectionReference,
  productRefs: Map<string, FirebaseFirestore.DocumentReference>,
): Promise<ProductById> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const entries = await Promise.all(productIds.map(async (productId) => {
    const ref = productsCollection.doc(productId);
    productRefs.set(productId, ref);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new OrderCreationError("product_unavailable", "One product in your cart is no longer available.", 409);
    const product = parseActiveProduct(snapshot.id, snapshot.data() ?? {});
    if (!product) throw new OrderCreationError("product_unavailable", "One product in your cart is no longer available.", 409);
    return [productId, product] as const;
  }));
  return new Map(entries);
}

async function readLooksForOrder(
  input: CreateOrderRequest,
  transaction: TransactionLike,
  looksCollection: FirebaseFirestore.CollectionReference,
): Promise<LookPriceById> {
  const lookIds = [...new Set(input.items.map((item) => item.lookId).filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
  const entries = await Promise.all(lookIds.map(async (lookId) => {
    const snapshot = await transaction.get(looksCollection.doc(lookId));
    if (!snapshot.exists) throw new OrderCreationError("look_unavailable", "One Look in your cart is no longer available.", 409);
    const data = snapshot.data() ?? {};
    if (data.status !== "active" || !isString(data.slug) || !isString(data.name) || !isNumber(data.priceDzd) || !Number.isInteger(data.priceDzd) || data.priceDzd <= 0 || !isImage(data.heroImage)) {
      throw new OrderCreationError("look_unavailable", "One Look in your cart is no longer available.", 409);
    }
    const productIds = Array.isArray(data.productIds) ? data.productIds.filter(isString) : [];
    if (!productIds.length) throw new OrderCreationError("look_unavailable", "One Look in your cart is no longer available.", 409);
    return [lookId, { id: lookId, slug: data.slug, name: data.name, priceDzd: data.priceDzd, compareAtPriceDzd: isNumber(data.compareAtPriceDzd) ? data.compareAtPriceDzd : null, discountPercent: isNumber(data.discountPercent) ? data.discountPercent : 0, heroImage: data.heroImage, productIds }] as const;
  }));
  return new Map(entries);
}

function buildOrderItems(input: CreateOrderRequest, products: ProductById, looks: LookPriceById): OrderItem[] {
  validateLookGroups(input, products, looks);
  const baseItems = input.items.map((item) => {
    const product = products.get(item.productId);
    if (!product) throw new OrderCreationError("product_unavailable", "One product in your cart is no longer available.", 409);
    const selectedColor = item.selectedColor ?? null;
    const selectedSize = item.selectedSize ?? null;
    validateVariant(product, selectedColor, selectedSize);
    validateQuantity(product, item.quantity);
    const canonicalLook = item.lookGroupId && item.lookId ? looks.get(item.lookId) : null;
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      image: product.images[0]?.url ?? "/placeholders/product-placeholder.webp",
      selectedSize,
      selectedColor,
      quantity: item.quantity,
      unitPriceDzd: product.priceDzd,
      lineTotalDzd: item.lookGroupId ? 0 : product.priceDzd * item.quantity,
      stockMode: product.stockMode,
      lookGroupId: item.lookGroupId ?? null,
      lookId: canonicalLook?.id ?? null,
      lookSlug: canonicalLook?.slug ?? null,
      lookName: canonicalLook?.name ?? null,
      lookImage: canonicalLook?.heroImage.url ?? null,
      lookOriginalProductIds: canonicalLook?.productIds ?? null,
      lookSelectedProductIds: null,
      lookPricingMode: null,
      lookPriceDzd: canonicalLook?.priceDzd ?? null,
      lookCompareAtPriceDzd: canonicalLook?.compareAtPriceDzd ?? null,
      lookDiscountPercent: canonicalLook?.discountPercent ?? null,
      lookSavingsDzd: null,
      displayPriceDzd: item.lookGroupId ? null : product.priceDzd * item.quantity,
      allocatedRevenueDzd: item.lookGroupId ? 0 : product.priceDzd * item.quantity,
      admin: calculateItemAdminSnapshot(product.costPriceDzd, item.lookGroupId ? 0 : product.priceDzd * item.quantity, item.quantity),
    } satisfies OrderItem;
  });

  const groups = new Map<string, OrderItem[]>();
  baseItems.forEach((item) => { if (item.lookGroupId) groups.set(item.lookGroupId, [...(groups.get(item.lookGroupId) ?? []), item]); });
  groups.forEach((groupItems) => {
    const firstItem = groupItems[0];
    const canonicalLook = firstItem?.lookId ? looks.get(firstItem.lookId) : null;
    if (!canonicalLook) throw new OrderCreationError("invalid_look_group", "A Look in your cart is invalid. Please rebuild it.", 400);
    const selectedProductIds = groupItems.map((item) => item.productId);
    const priceResult = calculateLookGroupPrice({
      canonicalLookPriceDzd: canonicalLook.priceDzd,
      originalProductIds: canonicalLook.productIds,
      selectedProductLines: groupItems.map((item) => ({ productId: item.productId, priceDzd: item.unitPriceDzd, quantity: item.quantity })),
      canonicalProducts: products,
    });
    if (priceResult.subtotalDzd <= 0 || priceResult.selectedItemCount <= 0) throw new OrderCreationError("invalid_look_group", "A Look in your cart is empty. Please rebuild it.", 400);
    const normalTotal = groupItems.reduce((sum, item) => sum + item.unitPriceDzd * item.quantity, 0);
    const pricingMode = priceResult.isCompleteLook ? "complete_look" : "partial_products";
    const regularSelectedTotal = groupItems.reduce((sum, item) => sum + item.unitPriceDzd * item.quantity, 0);
    const lookSavingsDzd = Math.max(regularSelectedTotal - priceResult.subtotalDzd, 0);
    let allocated = 0;
    groupItems.forEach((item, index) => {
      const value = index === groupItems.length - 1 ? priceResult.subtotalDzd - allocated : Math.round(priceResult.subtotalDzd * ((item.unitPriceDzd * item.quantity) / Math.max(1, normalTotal)));
      item.allocatedRevenueDzd = value;
      item.lineTotalDzd = index === 0 ? priceResult.subtotalDzd : 0;
      item.displayPriceDzd = index === 0 ? priceResult.subtotalDzd : null;
      item.lookSelectedProductIds = selectedProductIds;
      item.lookPricingMode = pricingMode;
      item.lookPriceDzd = priceResult.subtotalDzd;
      item.lookCompareAtPriceDzd = canonicalLook.compareAtPriceDzd;
      item.lookDiscountPercent = canonicalLook.discountPercent;
      item.lookSavingsDzd = lookSavingsDzd;
      item.admin = calculateItemAdminSnapshot(products.get(item.productId)?.costPriceDzd, item.lineTotalDzd, item.quantity);
      allocated += value;
    });
  });
  return baseItems;
}

function calculateItemAdminSnapshot(unitCostDzd: number | null | undefined, lineTotalDzd: number, quantity: number): NonNullable<OrderItem["admin"]> {
  if (typeof unitCostDzd !== "number" || !Number.isFinite(unitCostDzd)) return { unitCostDzd: null, lineCostDzd: null, estimatedLineProfitDzd: null };
  const lineCostDzd = unitCostDzd * quantity;
  return { unitCostDzd, lineCostDzd, estimatedLineProfitDzd: lineTotalDzd - lineCostDzd };
}

function calculateOrderAdminTotals(items: OrderItem[]): { costOfGoodsDzd: number | null; estimatedProfitDzd: number | null } {
  const lineCosts = items.map((item) => item.admin?.lineCostDzd);
  if (!lineCosts.length || lineCosts.some((value) => typeof value !== "number" || !Number.isFinite(value))) return { costOfGoodsDzd: null, estimatedProfitDzd: null };
  const knownLineCosts = lineCosts as number[];
  const costOfGoodsDzd = knownLineCosts.reduce((total, value) => total + value, 0);
  const itemsSubtotalDzd = items.reduce((total, item) => total + item.lineTotalDzd, 0);
  return { costOfGoodsDzd, estimatedProfitDzd: itemsSubtotalDzd - costOfGoodsDzd };
}

function validateLookGroups(input: CreateOrderRequest, products: ProductById, looks: LookPriceById): void {
  const groups = new Map<string, CreateOrderRequest["items"]>();
  for (const item of input.items) {
    if (!item.lookGroupId && item.lookId) throw new OrderCreationError("invalid_look_group", "A Look in your cart is invalid. Please rebuild it.", 400);
    if (!item.lookGroupId) continue;
    groups.set(item.lookGroupId, [...(groups.get(item.lookGroupId) ?? []), item]);
  }

  for (const [lookGroupId, groupItems] of groups) {
    const lookIds = new Set(groupItems.map((item) => item.lookId).filter((value): value is string => typeof value === "string" && value.trim().length > 0));
    if (lookIds.size !== 1) throw new OrderCreationError("invalid_look_group", "A Look in your cart mixes multiple Looks. Please rebuild it.", 400);
    const [lookId] = [...lookIds];
    const look = looks.get(lookId);
    if (!look) throw new OrderCreationError("look_unavailable", "One Look in your cart is no longer available.", 409);
    const canonicalProductIds = new Set(look.productIds);
    const selectedProductIds = new Set<string>();
    for (const item of groupItems) {
      if (item.quantity !== 1) throw new OrderCreationError("invalid_look_group", "Look items support quantity 1 only. Please rebuild the Look.", 400);
      if (!canonicalProductIds.has(item.productId)) throw new OrderCreationError("invalid_look_group", "A product in your Look does not belong to that Look. Please rebuild it.", 400);
      if (selectedProductIds.has(item.productId)) throw new OrderCreationError("invalid_look_group", "A Look contains a duplicate product. Please rebuild it.", 400);
      selectedProductIds.add(item.productId);
      const product = products.get(item.productId);
      if (!product) throw new OrderCreationError("product_unavailable", "One product in your Look is no longer available.", 409);
    }
    if (!selectedProductIds.size || !lookGroupId.trim()) throw new OrderCreationError("invalid_look_group", "A Look in your cart is invalid. Please rebuild it.", 400);
  }
}

function validateVariant(product: Product, selectedColor: string | null, selectedSize: string | null): void {
  if (product.colors.length > 0 && !selectedColor) throw new OrderCreationError("invalid_color", `Choose a color for ${product.name}.`, 400);
  if (selectedColor && !product.colors.some((color) => color.name === selectedColor)) throw new OrderCreationError("invalid_color", `Choose a valid color for ${product.name}.`, 400);
  if (product.sizes.length > 0 && !selectedSize) throw new OrderCreationError("invalid_size", `Choose a size for ${product.name}.`, 400);
  if (selectedSize && !product.sizes.some((size) => size.label === selectedSize)) throw new OrderCreationError("invalid_size", `Choose a valid size for ${product.name}.`, 400);
}

function validateQuantity(product: Product, quantity: number): void {
  if (!product.inStock) throw new OrderCreationError("product_unavailable", `${product.name} is out of stock.`, 409);
  if (product.stockMode === "limited" && typeof product.stockQty === "number" && quantity > product.stockQty) throw new OrderCreationError("insufficient_stock", `Not enough stock for ${product.name}.`, 409);
}

function applyStockUpdates(
  items: OrderItem[],
  products: ProductById,
  productRefs: Map<string, FirebaseFirestore.DocumentReference>,
  transaction: FirebaseFirestore.Transaction,
  updatedAt: FirebaseFirestore.FieldValue,
): void {
  const requestedByProduct = new Map<string, number>();
  for (const item of items) requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
  for (const [productId, requestedQuantity] of requestedByProduct) {
    const product = products.get(productId);
    const ref = productRefs.get(productId);
    if (!product || !ref || product.stockMode !== "limited") continue;
    const currentStock = typeof product.stockQty === "number" ? product.stockQty : 0;
    if (!product.inStock || requestedQuantity < 1 || currentStock < requestedQuantity) throw new OrderCreationError("insufficient_stock", `Not enough stock for ${product.name}.`, 409);
    const remaining = currentStock - requestedQuantity;
    transaction.update(ref, { stockQty: remaining, inStock: remaining > 0, updatedAt });
  }
}

function parseActiveProduct(id: string, data: FirebaseFirestore.DocumentData): Product | null {
  if (!isString(data.slug) || !isString(data.name) || !isCategory(data.category) || data.status !== "active" || !isNumber(data.priceDzd)) return null;
  const images = parseProductImages(data.images, data.name);
  const colors = normalizeProductColors(data.colors);
  const sizes = parseArray(data.sizes, isProductSize);
  return {
    id,
    slug: data.slug,
    name: data.name,
    description: isString(data.description) ? data.description : "",
    details: parseArray(data.details, isString),
    category: data.category,
    status: "active",
    priceDzd: data.priceDzd,
    compareAtPriceDzd: isNumber(data.compareAtPriceDzd) ? data.compareAtPriceDzd : null,
    costPriceDzd: isNumber(data.costPriceDzd) ? data.costPriceDzd : null,
    images,
    colors,
    sizes,
    stockMode: isStockMode(data.stockMode) ? data.stockMode : "made_to_order",
    stockQty: isNumber(data.stockQty) ? data.stockQty : null,
    inStock: typeof data.inStock === "boolean" ? data.inStock : true,
    featured: typeof data.featured === "boolean" ? data.featured : false,
    showInDrop001: typeof data.showInDrop001 === "boolean" ? data.showInDrop001 : false,
    showInFeaturedDrop: typeof data.showInFeaturedDrop === "boolean" ? data.showInFeaturedDrop : false,
    showInShopTheLook: typeof data.showInShopTheLook === "boolean" ? data.showInShopTheLook : false,
    featuredSortOrder: isNumber(data.featuredSortOrder) ? data.featuredSortOrder : null,
    lookGroupSlug: isString(data.lookGroupSlug) ? data.lookGroupSlug : null,
    isPromo: typeof data.isPromo === "boolean" ? data.isPromo : false,
    dropSlug: data.dropSlug === "drop-001" ? "drop-001" : null,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    createdAt: isString(data.createdAt) ? data.createdAt : null,
    updatedAt: isString(data.updatedAt) ? data.updatedAt : null,
  };
}

function parseArray<T>(value: unknown, guard: (entry: unknown) => entry is T): T[] { return Array.isArray(value) ? value.filter(guard) : []; }
function parseProductImages(value: unknown, productName: string): ProductImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index): ProductImage[] => {
    if (typeof entry === "string" && entry.trim()) return [{ id: `image-${index}`, url: entry.trim(), alt: `${productName} image ${index + 1}`, sortOrder: index, isPrimary: index === 0, colorId: null }];
    if (!isRecord(entry) || !isString(entry.url)) return [];
    return [{ id: isString(entry.id) ? entry.id : (isString(entry.publicId) ? entry.publicId : `image-${index}`), url: entry.url, alt: isString(entry.alt) ? entry.alt : `${productName} image ${index + 1}`, ...(isString(entry.publicId) ? { publicId: entry.publicId } : {}), sortOrder: isNumber(entry.sortOrder) ? entry.sortOrder : index, isPrimary: typeof entry.isPrimary === "boolean" ? entry.isPrimary : index === 0, colorId: isString(entry.colorId) ? entry.colorId : null }];
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}
function isProductSize(value: unknown): value is ProductSize { return isRecord(value) && isString(value.label); }
function isCategory(value: unknown): value is ProductCategory { return value === "tshirts" || value === "pants" || value === "hoodies" || value === "accessories"; }
function isStockMode(value: unknown): value is ProductStockMode { return value === "unlimited" || value === "limited" || value === "made_to_order"; }
function isImage(value: unknown): value is { url: string; alt: string } { return isRecord(value) && isString(value.url) && isString(value.alt); }
function isString(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isNumber(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
