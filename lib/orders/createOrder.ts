import "server-only";

import type { Product, ProductCategory, ProductColor, ProductImage, ProductSize, ProductStockMode } from "@/types/product";
import type { CreateOrderRequest, CreateOrderResponse, DeliveryInfo, OrderItem, OrderRecord } from "@/types/order";
import { createOrderNumber } from "@/lib/orders/orderNumber";
import { shippingCalculator } from "@/lib/orders/shipping";
import { prepareStockReservation } from "@/lib/orders/stock";
import { normalizeEmail, normalizePhone } from "@/lib/orders/validation";

const ORDERS_COLLECTION = "orders";
const PRODUCTS_COLLECTION = "products";

export async function createOrder(input: CreateOrderRequest): Promise<CreateOrderResponse> {
  const [{ adminDb }, { Timestamp }] = await Promise.all([
    import("@/lib/firebase/admin"),
    import("firebase-admin/firestore"),
  ]);

  const now = new Date();
  const nowIso = now.toISOString();
  const orderRef = adminDb.collection(ORDERS_COLLECTION).doc();
  const orderNumber = createOrderNumber(now);

  const record = await adminDb.runTransaction(async (transaction) => {
    const products = await readProductsForOrder(input, transaction, adminDb.collection(PRODUCTS_COLLECTION));
    const delivery = normalizeDelivery(input.delivery);
    const items = buildOrderItems(input, products);
    const shippingQuote = await shippingCalculator.quote(delivery);
    const itemsSubtotalDzd = items.reduce((total, item) => total + item.lineTotalDzd, 0);
    const shippingDzd = shippingQuote.amountDzd;
    const stockPlan = prepareStockReservation(items);
    const customer = {
      fullName: input.customer.fullName.trim(),
      phone: input.customer.phone.trim(),
      phoneNormalized: normalizePhone(input.customer.phone),
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
        totalDzd: itemsSubtotalDzd + (shippingDzd ?? 0),
        deliveryPricingStatus: shippingQuote.status,
      },
      statusHistory: [{ status: "pending", at: nowIso, actor: "system", note: "Order created by server API." }],
      customerLookup: {
        phoneNormalized: customer.phoneNormalized,
        emailNormalized: customer.email,
      },
      admin: {
        needsReview: true,
        notes: stockPlan.shouldReserve ? "Stock reservation pending." : "Stock reservation deferred to Admin Products sprint.",
      },
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    transaction.set(orderRef, {
      ...order,
      createdAtTimestamp: Timestamp.fromDate(now),
      updatedAtTimestamp: Timestamp.fromDate(now),
    });

    return order;
  });

  return {
    orderId: record.id,
    orderNumber: record.orderNumber,
    status: record.status,
    paymentStatus: record.paymentStatus,
    totals: record.totals,
  };
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

type TransactionLike = {
  get: (ref: FirebaseFirestore.DocumentReference) => Promise<FirebaseFirestore.DocumentSnapshot>;
};

async function readProductsForOrder(
  input: CreateOrderRequest,
  transaction: TransactionLike,
  productsCollection: FirebaseFirestore.CollectionReference,
): Promise<ProductById> {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const entries = await Promise.all(productIds.map(async (productId) => {
    const snapshot = await transaction.get(productsCollection.doc(productId));
    if (!snapshot.exists) {
      throw new Error(`Product not found: ${productId}`);
    }

    const product = parseActiveProduct(snapshot.id, snapshot.data() ?? {});
    if (!product) {
      throw new Error(`Product is not active or invalid: ${productId}`);
    }

    return [productId, product] as const;
  }));

  return new Map(entries);
}

function buildOrderItems(input: CreateOrderRequest, products: ProductById): OrderItem[] {
  return input.items.map((item) => {
    const product = products.get(item.productId);
    if (!product) {
      throw new Error(`Product not available: ${item.productId}`);
    }

    const selectedColor = item.selectedColor ?? null;
    const selectedSize = item.selectedSize ?? null;
    validateVariant(product, selectedColor, selectedSize);
    validateQuantity(product, item.quantity);

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
      lineTotalDzd: product.priceDzd * item.quantity,
      stockMode: product.stockMode,
    };
  });
}

function validateVariant(product: Product, selectedColor: string | null, selectedSize: string | null): void {
  if (product.colors.length > 0 && !selectedColor) {
    throw new Error(`Missing color for ${product.name}`);
  }

  if (selectedColor && !product.colors.some((color) => color.name === selectedColor)) {
    throw new Error(`Invalid color for ${product.name}`);
  }

  if (product.sizes.length > 0 && !selectedSize) {
    throw new Error(`Missing size for ${product.name}`);
  }

  if (selectedSize && !product.sizes.some((size) => size.label === selectedSize)) {
    throw new Error(`Invalid size for ${product.name}`);
  }
}

function validateQuantity(product: Product, quantity: number): void {
  if (!product.inStock) {
    throw new Error(`${product.name} is out of stock`);
  }

  if (product.stockMode === "limited" && typeof product.stockQty === "number" && quantity > product.stockQty) {
    throw new Error(`${product.name} quantity exceeds available stock`);
  }
}

function parseActiveProduct(id: string, data: FirebaseFirestore.DocumentData): Product | null {
  if (!isString(data.slug) || !isString(data.name) || !isCategory(data.category) || data.status !== "active" || !isNumber(data.priceDzd)) {
    return null;
  }

  const images = parseArray(data.images, isProductImage);
  const colors = parseArray(data.colors, isProductColor);
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
    images,
    colors,
    sizes,
    stockMode: isStockMode(data.stockMode) ? data.stockMode : "made_to_order",
    stockQty: isNumber(data.stockQty) ? data.stockQty : null,
    inStock: typeof data.inStock === "boolean" ? data.inStock : true,
    featured: typeof data.featured === "boolean" ? data.featured : false,
    isPromo: typeof data.isPromo === "boolean" ? data.isPromo : false,
    dropSlug: data.dropSlug === "drop-001" ? "drop-001" : null,
    sortOrder: isNumber(data.sortOrder) ? data.sortOrder : 999,
    createdAt: isString(data.createdAt) ? data.createdAt : null,
    updatedAt: isString(data.updatedAt) ? data.updatedAt : null,
  };
}

function parseArray<T>(value: unknown, guard: (entry: unknown) => entry is T): T[] {
  return Array.isArray(value) ? value.filter(guard) : [];
}

function isProductImage(value: unknown): value is ProductImage {
  return isRecord(value) && isString(value.url) && isString(value.alt);
}

function isProductColor(value: unknown): value is ProductColor {
  return isRecord(value) && isString(value.name) && isString(value.hex);
}

function isProductSize(value: unknown): value is ProductSize {
  return isRecord(value) && isString(value.label);
}

function isCategory(value: unknown): value is ProductCategory {
  return value === "tshirts" || value === "pants" || value === "hoodies" || value === "accessories";
}

function isStockMode(value: unknown): value is ProductStockMode {
  return value === "unlimited" || value === "limited" || value === "made_to_order";
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
