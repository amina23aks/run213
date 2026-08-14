import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminOverview } from "@/lib/admin/overview";
import type { OverviewRangeKey } from "@/lib/time/algiers";

export const dynamic = "force-dynamic";
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);
  if (!adminVerification.ok) return adminVerification.response;
  try {
    const requested = new URL(request.url).searchParams.get("range");
    const range: OverviewRangeKey = requested === "today" || requested === "7d" || requested === "30d" || requested === "month" ? requested : "7d";
    return Response.json(await getAdminOverview(range), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[admin-overview] request failed", error instanceof Error ? { name: error.name } : { name: "UnknownError" });
    return adminJsonError("Overview is temporarily unavailable.", 503);
  }
}
