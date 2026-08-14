import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/admin/overview";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);
  if (!adminVerification.ok) return adminVerification.response;
  try {
    return Response.json(await getAdminOverview(), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[admin-overview] request failed", error instanceof Error ? { name: error.name } : { name: "UnknownError" });
    return adminJsonError("Overview is temporarily unavailable.", 503);
  }
}
