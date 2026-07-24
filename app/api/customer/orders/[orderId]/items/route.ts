import { NextResponse, type NextRequest } from "next/server";
import { CustomerAuthError, verifyOptionalCustomerRequest } from "@/lib/customer-auth";
import { CustomerOrderError, editCustomerOrderItemOptions } from "@/lib/orders/customer";

type Params = { params: Promise<{ orderId: string }> };
export async function PATCH(request: NextRequest, { params }: Params) {
  try { const { orderId } = await params; const auth = await verifyOptionalCustomerRequest(request); const body = await request.json().catch(() => ({})); const order = await editCustomerOrderItemOptions(orderId, auth, request.headers.get("x-run213-order-token"), body); return NextResponse.json({ ok: true, order }); }
  catch (error) { if (error instanceof CustomerAuthError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); if (error instanceof CustomerOrderError) return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status }); return NextResponse.json({ ok: false, code: "item_edit_failed", message: "Item options could not be updated." }, { status: 503 }); }
}
