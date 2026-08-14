import { z } from "zod";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { AdminOrderError, updateAdminOrderStatus } from "@/lib/orders/admin";
import type { OrderStatus } from "@/types/order";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
const bodySchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled", "returned"]),
  note: z.string().trim().max(240).nullable().optional(),
  returnCostDzd: z.number().int().min(0).max(1_000_000).optional(),
}).superRefine((value, context) => {
  if (value.status === "returned" && value.returnCostDzd === undefined) context.addIssue({ code: "custom", path: ["returnCostDzd"], message: "Return cost is required." });
});

export async function POST(request: Request, { params }: Params) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const admin = adminVerification.admin;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid status update", issues: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  try {
    const order = await updateAdminOrderStatus(id, parsed.data.status as OrderStatus, admin, parsed.data.note ?? null, parsed.data.returnCostDzd);
    return Response.json({ order });
  } catch (error) {
    if (error instanceof AdminOrderError) return adminJsonError(error.message, error.status);
    console.error("[admin-orders] Status update failed", error);
    return adminJsonError("Order status could not be updated.", 503);
  }
}
