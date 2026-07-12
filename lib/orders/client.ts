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
      lookPriceDzd: item.lookPriceDzd ?? null,
    })),
    idempotencyKey: crypto.randomUUID(),
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

export async function submitOrderToApi(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = getErrorMessage(body, response.status);
    throw new OrderSubmissionError(message, response.status);
  }

  return body as CreateOrderResponse;
}

function getErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
    return body.error;
  }

  if (status === 429) return "Too many checkout attempts. Please try again later.";
  if (status === 400) return "Please check your order details and try again.";
  return "Could not create order. Please try again.";
}
