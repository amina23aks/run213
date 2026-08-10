import { NextResponse, type NextRequest } from "next/server";
import { createOrder, findCompletedOrderForCheckout, OrderCreationError } from "@/lib/orders/createOrder";
import { checkCheckoutRateLimits } from "@/lib/orders/checkoutRateLimit";
import { DurableRateLimitUnavailableError } from "@/lib/rate-limit";
import { createOrderRequestSchema } from "@/lib/orders/validation";
import { normalizePhone } from "@/lib/orders/validation";
import type { OrderErrorResponse } from "@/types/order";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createOrderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return orderError("invalid_request", "Invalid order details.", 400, Object.fromEntries(parsed.error.issues.slice(0, 8).map((issue) => [issue.path.join(".") || "form", issue.message])));
  }

  try {
    // Validation and normalization precede quota use. A completed replay is resolved by
    // Firestore, the final idempotency authority, before any new checkout quota is spent.
    const normalizedPhone = normalizePhone(parsed.data.customer.phone);
    const customer = await verifyOptionalCustomerRequest(request);
    const existingOrder = await findCompletedOrderForCheckout(parsed.data, normalizedPhone);
    if (existingOrder) return NextResponse.json({ ok: true, ...existingOrder }, { status: 200 });

    const rateLimit = await checkCheckoutRateLimits({
      ip: getClientIp(request),
      normalizedPhone,
      authenticatedUid: customer?.uid ?? null,
    });
    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return orderError("RATE_LIMITED", "Too many checkout attempts. Please try again shortly.", 429, undefined, retryAfterSeconds);
    }

    const order = await createOrder(parsed.data, customer?.uid ?? null, normalizedPhone);
    return NextResponse.json({ ok: true, ...order }, { status: order.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof CustomerAuthError) return orderError(error.code, error.message, error.status);
    if (error instanceof DurableRateLimitUnavailableError) return orderError("CHECKOUT_PROTECTION_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again shortly.", 503);
    if (error instanceof OrderCreationError) {
      console.warn("Order creation rejected", { code: error.code, status: error.status, message: error.message });
      return orderError(error.code, error.message, error.status);
    }
    console.error("Order creation failed", error);
    return orderError("order_failed", "Could not create order. Please try again.", 503);
  }
}

function orderError(code: string, message: string, status: number, fieldErrors?: Record<string, string>, retryAfterSeconds?: number) {
  const body: OrderErrorResponse & { retryAfterSeconds?: number } = { ok: false, code, message, ...(fieldErrors ? { fieldErrors } : {}), ...(retryAfterSeconds ? { retryAfterSeconds } : {}) };
  return NextResponse.json(body, { status, headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined });
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}
