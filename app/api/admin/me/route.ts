import { verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);

  if (!admin) {
    return Response.json({ isAdmin: false }, { status: 401 });
  }

  return Response.json({ isAdmin: true, email: admin.email });
}
