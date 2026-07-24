import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";
import { getCustomerOrder } from "@/lib/orders/customer";

type Params = { params: Promise<{ orderId: string }> };
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { orderId } = await params;
    const auth = await verifyOptionalCustomerRequest(request);
    const token = request.headers.get("x-run213-order-token");
    const order = await getCustomerOrder(orderId, auth, token);
    if (!order) return NextResponse.json({ ok: false, code: "not_found", message: "Order not found." }, { status: 404 });
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, code: "order_failed", message: "Order could not be loaded." }, { status: 503 });
  }
}
