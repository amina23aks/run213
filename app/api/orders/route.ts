import { NextResponse, type NextRequest } from "next/server";
import { createOrder, OrderCreationError } from "@/lib/orders/createOrder";
import { checkRateLimit } from "@/lib/orders/rateLimit";
import { createOrderRequestSchema } from "@/lib/orders/validation";
import type { OrderErrorResponse } from "@/types/order";
import { verifyOptionalCustomerRequest } from "@/lib/customer-auth";

const CHECKOUT_RATE_LIMIT = 8;
const CHECKOUT_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createOrderRequestSchema.safeParse(body);

  if (!parsed.success) {
    return orderError("invalid_request", "Invalid order details.", 400, Object.fromEntries(parsed.error.issues.slice(0, 8).map((issue) => [issue.path.join(".") || "form", issue.message])));
  }

  const ip = getClientIp(request);
  const customerKey = parsed.data.customer.phone.replace(/[^0-9+]/g, "") || "unknown-phone";
  const rateLimit = checkRateLimit(`orders:${ip}:${customerKey}`, CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_WINDOW_MS, parsed.data.idempotencyKey);

  if (!rateLimit.allowed) {
    return orderError("rate_limited", "Too many checkout attempts. Please try again later.", 429, undefined, rateLimit.retryAfterSeconds);
  }

  try {
    const customer = await verifyOptionalCustomerRequest(request);
    const order = await createOrder(parsed.data, customer?.uid ?? null);
    return NextResponse.json({ ok: true, ...order }, { status: order.idempotent ? 200 : 201 });
  } catch (error) {
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
