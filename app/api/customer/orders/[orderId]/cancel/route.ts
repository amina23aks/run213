import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";
import { cancelCustomerOrder, CustomerOrderError } from "@/lib/orders/customer";

type Params = { params: Promise<{ orderId: string }> };
export async function POST(request: NextRequest, { params }: Params) {
  try { const { orderId } = await params; const auth = await verifyOptionalCustomerRequest(request); const order = await cancelCustomerOrder(orderId, auth, request.headers.get("x-run213-order-token")); return NextResponse.json({ ok: true, order }); }
  catch (error) { if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); if (error instanceof CustomerOrderError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ ok: false, code: "cancel_failed", message: "Order could not be cancelled." }, { status: 503 }); }
}
