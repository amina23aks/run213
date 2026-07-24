import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";
import { editCustomerDelivery, CustomerOrderError } from "@/lib/orders/customer";

type Params = { params: Promise<{ orderId: string }> };
export async function PATCH(request: NextRequest, { params }: Params) {
  try { const { orderId } = await params; const auth = await verifyOptionalCustomerRequest(request); const body = await request.json().catch(() => ({})); const order = await editCustomerDelivery(orderId, auth, request.headers.get("x-run213-order-token"), body); return NextResponse.json({ ok: true, order }); }
  catch (error) { if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); if (error instanceof CustomerOrderError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ ok: false, code: "edit_failed", message: "Delivery details could not be updated." }, { status: 503 }); }
}
