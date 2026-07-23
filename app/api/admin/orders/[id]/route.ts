import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminOrder } from "@/lib/orders/admin";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) return adminJsonError("Order not found", 404);
  return Response.json({ order });
}
