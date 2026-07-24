import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, requireCustomerRequest } from "@/lib/customer-auth";
import { claimGuestOrders } from "@/lib/orders/customer";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const auth = await requireCustomerRequest(request);
    const body = await request.json().catch(() => ({}));
    const pairs = Array.isArray(body?.orders) ? body.orders : [];
    const claimedOrderIds = await claimGuestOrders(auth, pairs);
    return NextResponse.json({ ok: true, claimedOrderIds });
  } catch (error) {
    if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, code: "claim_failed", message: "Guest orders could not be claimed." }, { status: 503 });
  }
}
