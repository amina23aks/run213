import type { CartItem } from "@/types/cart";
import type { CreateOrderRequest, CreateOrderResponse, DeliveryMode } from "@/types/order";

export type OrderFormValues = {
  fullName: string;
  phone: string;
  wilaya: string;
  deliveryMode: DeliveryMode;
  address: string;
  commune?: string | null;
  notes?: string | null;
};

export class OrderSubmissionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderSubmissionError";
    this.status = status;
  }
}

export function buildCreateOrderRequest(values: OrderFormValues, cartItems: CartItem[]): CreateOrderRequest {
  return {
    customer: {
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
    },
    delivery: {
      wilaya: values.wilaya,
      deliveryMode: values.deliveryMode,
      address: values.address.trim(),
      commune: values.commune?.trim() || null,
      notes: values.notes?.trim() || null,
    },
    items: cartItems.map((item) => ({
      productId: item.productId,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      quantity: item.quantity,
      lookGroupId: item.lookGroupId ?? null,
      lookId: item.lookId ?? null,
      lookSlug: item.lookSlug ?? null,
      lookName: item.lookName ?? null,
      lookImage: item.lookImage ?? null,
      lookOriginalProductIds: item.lookOriginalProductIds ?? null,
    })),
    idempotencyKey: getCheckoutAttemptKey(cartItems),
  };
}

export function validateOrderFormValues(values: OrderFormValues, cartItems: CartItem[]): string | null {
  if (!cartItems.length) return "Your cart is empty.";
  if (!values.fullName.trim()) return "Full name is required.";
  if (!values.phone.trim()) return "Phone number is required.";
  if (!values.wilaya) return "Wilaya is required.";
  if (values.deliveryMode !== "home" && values.deliveryMode !== "desk") return "Delivery mode is required.";
  if (!values.address.trim()) return "Address is required.";
  return null;
}

export async function submitOrderToApi(payload: CreateOrderRequest, idToken?: string | null): Promise<CreateOrderResponse> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = getErrorMessage(body, response.status);
    throw new OrderSubmissionError(message, response.status);
  }

  return body as CreateOrderResponse;
}

export function getCheckoutCartSignature(cartItems: CartItem[]): string {
  return cartItems.map((item) => [item.productId, item.selectedSize ?? "", item.selectedColor ?? "", item.quantity, item.lookGroupId ?? ""].join(":"))
    .sort()
    .join("|");
}

let checkoutAttemptKey: { signature: string; key: string } | null = null;

export function getCheckoutAttemptKey(cartItems: CartItem[]): string {
  const signature = getCheckoutCartSignature(cartItems);
  if (!checkoutAttemptKey || checkoutAttemptKey.signature !== signature) checkoutAttemptKey = { signature, key: crypto.randomUUID() };
  return checkoutAttemptKey.key;
}

export function resetCheckoutAttemptKey() { checkoutAttemptKey = null; }


function getErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null) {
    if ("message" in body && typeof body.message === "string") return body.message;
    if ("error" in body && typeof body.error === "string") return body.error;
  }

  if (status === 429) { const retryAfter = typeof body === "object" && body !== null && "retryAfterSeconds" in body && typeof body.retryAfterSeconds === "number" ? ` Please wait about ${Math.ceil(body.retryAfterSeconds / 60)} minute(s).` : ""; return `Too many checkout attempts.${retryAfter}`; }
  if (status === 400) return "Please check your order details and try again.";
  return "Could not create order. Please try again.";
}
