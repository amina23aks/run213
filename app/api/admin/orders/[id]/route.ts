import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminOrder } from "@/lib/orders/admin";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) return adminJsonError("Order not found", 404);
  return Response.json({ order });
}
