import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { AdminOrderError, updateAdminOrderStatus } from "@/lib/orders/admin";
import type { OrderStatus } from "@/types/order";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
const bodySchema = z.object({ status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"]), note: z.string().trim().max(240).nullable().optional() });

export async function POST(request: Request, { params }: Params) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid status update", issues: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  try {
    const order = await updateAdminOrderStatus(id, parsed.data.status as OrderStatus, admin, parsed.data.note ?? null);
    return Response.json({ order });
  } catch (error) {
    if (error instanceof AdminOrderError) return adminJsonError(error.message, error.status);
    console.error("[admin-orders] Status update failed", error);
    return adminJsonError("Order status could not be updated.", 503);
  }
}
