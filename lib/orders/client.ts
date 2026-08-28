import type { CartItem } from "@/types/cart";
import type { CreateOrderRequest, CreateOrderResponse, DeliveryMode } from "@/types/order";
import { customerDeliveryEditSchema } from "@/lib/orders/validation";

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
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "OrderSubmissionError";
    this.status = status;
    this.fieldErrors = fieldErrors;
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
      selectedColorId: item.selectedColorId ?? null,
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

export function validateOrderFormFields(values: OrderFormValues, cartItems: CartItem[]): { message: string | null; fieldErrors: Record<string, string> } {
  if (!cartItems.length) return { message: "Your cart is empty.", fieldErrors: {} };
  const parsed = customerDeliveryEditSchema.safeParse(values);
  if (parsed.success) return { message: null, fieldErrors: {} };
  return { message: "Check the highlighted delivery details.", fieldErrors: issuesToFieldErrors(parsed.error.issues) };
}

export function validateOrderFormValues(values: OrderFormValues, cartItems: CartItem[]): string | null {
  return validateOrderFormFields(values, cartItems).message;
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
    throw new OrderSubmissionError(message, response.status, getFieldErrors(body));
  }

  return body as CreateOrderResponse;
}

export function getCheckoutCartSignature(cartItems: CartItem[]): string {
  return cartItems.map((item) => [item.productId, item.selectedSize ?? "", item.selectedColorId ?? item.selectedColor ?? "", item.quantity, item.lookGroupId ?? ""].join(":"))
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

function getFieldErrors(body: unknown): Record<string, string> {
  if (typeof body !== "object" || body === null || !("fieldErrors" in body) || typeof body.fieldErrors !== "object" || body.fieldErrors === null) return {};
  return Object.fromEntries(Object.entries(body.fieldErrors).flatMap(([path, message]) => typeof message === "string" ? [[path.split(".").at(-1) ?? path, message]] : []));
}

function issuesToFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  return Object.fromEntries(issues.flatMap((issue) => typeof issue.path[0] === "string" ? [[issue.path[0], issue.message]] : []));
}
