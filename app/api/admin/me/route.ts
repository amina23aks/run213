import { verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);
  if (!adminVerification.ok) return adminVerification.response;
  const admin = adminVerification.admin;

  return Response.json({ isAdmin: true, email: admin.email });
}
