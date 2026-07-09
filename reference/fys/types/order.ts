import type { ProductCategory, ProductStockMode } from "@/reference/types/product";

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
  };
  idempotencyKey: string | null;
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
  }>;
  idempotencyKey?: string | null;
};

export type CreateOrderResponse = {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totals: OrderTotals;
};
