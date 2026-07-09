import { getMissingFirebaseAdminEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const cloudinaryEnvKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const;

export function GET() {
  const missingCloudinaryEnv = cloudinaryEnvKeys.filter((key) => !process.env[key]);

  return Response.json({
    missingServerEnv: getMissingFirebaseAdminEnv(),
    missingCloudinaryEnv,
    cloudinaryConfigured: missingCloudinaryEnv.length === 0,
  });
}
