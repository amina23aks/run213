import { getMissingFirebaseAdminEnv } from "@/lib/env";
import { verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const cloudinaryEnvKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;

export async function GET(request: Request) {
  const adminVerification = await verifyAdminRequest(request);
  if (!adminVerification.ok) return adminVerification.response;

  const missingCloudinaryEnv = cloudinaryEnvKeys.filter((key) => !process.env[key]);

  return Response.json({
    missingServerEnv: getMissingFirebaseAdminEnv(),
    missingCloudinaryEnv,
    cloudinaryConfigured: missingCloudinaryEnv.length === 0,
  });
}
