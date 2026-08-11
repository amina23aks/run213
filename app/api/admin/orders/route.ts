import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { AdminOrderError, listAdminOrders } from "@/lib/orders/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);

  if (!adminVerification.ok) return adminVerification.response;

  const url = new URL(request.url);
  try {
    const result = await listAdminOrders({
      limit: Number(url.searchParams.get("limit") ?? 15),
      cursor: url.searchParams.get("cursor"),
      status: url.searchParams.get("status"),
      search: url.searchParams.get("search"),
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof AdminOrderError) return adminJsonError(error.message, error.status);
    console.error("[admin-orders] List failed", error);
    return adminJsonError("Orders could not be loaded.", 503);
  }
}
