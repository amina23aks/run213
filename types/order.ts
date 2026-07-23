import type { ProductCategory, ProductStockMode } from "@/types/product";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "cod_pending" | "paid" | "refunded" | "failed";

export type PaymentMethod = "cash_on_delivery";

export type DeliveryMode = "home" | "desk";

export type DeliveryPricingStatus = "pending_quote" | "quoted" | "not_available";

export type CustomerInfo = {
  fullName: string;
  phone: string;
  phoneNormalized: string;
  email: string | null;
};

export type DeliveryInfo = {
  wilaya: string;
  deliveryMode: DeliveryMode;
  address: string;
  commune: string | null;
  notes: string | null;
};

export type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  category: ProductCategory;
  image: string;
  selectedSize: string | null;
  selectedColor: string | null;
  quantity: number;
  unitPriceDzd: number;
  lineTotalDzd: number;
  stockMode: ProductStockMode;
  lookGroupId?: string | null;
  lookId?: string | null;
  lookSlug?: string | null;
  lookName?: string | null;
  lookImage?: string | null;
  lookOriginalProductIds?: string[] | null;
  lookSelectedProductIds?: string[] | null;
  lookPricingMode?: "complete_look" | "partial_products" | null;
  lookPriceDzd?: number | null;
  lookCompareAtPriceDzd?: number | null;
  lookDiscountPercent?: number | null;
  lookSavingsDzd?: number | null;
  displayPriceDzd?: number | null;
  allocatedRevenueDzd?: number | null;
  admin?: {
    unitCostDzd: number | null;
    lineCostDzd: number | null;
    estimatedLineProfitDzd: number | null;
  };
};

export type OrderTotals = {
  itemsSubtotalDzd: number;
  shippingDzd: number | null;
  totalDzd: number;
  deliveryPricingStatus: DeliveryPricingStatus;
};

export type OrderStatusEvent = {
  status: OrderStatus;
  at: string;
  actor: "system" | "admin" | "customer";
  note: string | null;
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  customer: CustomerInfo;
  delivery: DeliveryInfo;
  items: OrderItem[];
  totals: OrderTotals;
  statusHistory: OrderStatusEvent[];
  customerLookup: {
    phoneNormalized: string;
    emailNormalized: string | null;
  };
  admin: {
    needsReview: boolean;
    notes: string | null;
    costOfGoodsDzd?: number | null;
    estimatedProfitDzd?: number | null;
  };
  /** @deprecated New orders store idempotencyKeyHash only; this remains nullable for old document compatibility. */
  idempotencyKey: string | null;
  idempotencyKeyHash?: string | null;
  inventoryRestoredAt?: string | null;
  inventoryRestoredBy?: string | null;
  inventoryRestorationReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderRequest = {
  customer: {
    fullName: string;
    phone: string;
    email?: string | null;
  };
  delivery: {
    wilaya: string;
    deliveryMode: DeliveryMode;
    address: string;
    commune?: string | null;
    notes?: string | null;
  };
  items: Array<{
    productId: string;
    selectedSize?: string | null;
    selectedColor?: string | null;
    quantity: number;
    lookGroupId?: string | null;
    lookId?: string | null;
    lookSlug?: string | null;
    lookName?: string | null;
    lookImage?: string | null;
    lookOriginalProductIds?: string[] | null;
  }>;
  idempotencyKey?: string | null;
};

export type CreateOrderResponse = {
  ok?: true;
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totals: OrderTotals;
  idempotent?: boolean;
};

export type OrderErrorResponse = {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
};
