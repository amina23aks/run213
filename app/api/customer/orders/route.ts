import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";
import { parseGuestAccessHeader } from "@/lib/orders/accessToken";
import { CustomerOrderError, listCustomerOrders } from "@/lib/orders/customer";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyOptionalCustomerRequest(request);
    const guest = auth ? [] : parseGuestAccessHeader(request.headers.get("x-run213-order-access"));
    const orders = await listCustomerOrders(auth, guest, request.nextUrl.searchParams.get("cursor"));
    return NextResponse.json({ ok: true, ...orders });
  } catch (error) { if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    if (error instanceof CustomerOrderError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, code: "orders_failed", message: "Orders could not be loaded." }, { status: 503 });
  }
}
