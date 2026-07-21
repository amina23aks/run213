import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createRunClubPublicId, getCloudinaryEnv, signCloudinaryParams } from "@/lib/run-club/cloudinary";
import { getAlgiersMonthKey, safeApiError } from "@/lib/run-club/security";
import { RUN_CLUB_ALLOWED_MIME_TYPES, RUN_CLUB_MAX_IMAGE_BYTES } from "@/lib/run-club/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({ fileType: z.enum(RUN_CLUB_ALLOWED_MIME_TYPES), fileSize: z.number().int().positive().max(RUN_CLUB_MAX_IMAGE_BYTES) }).strict();

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return safeApiError("invalid_image", "Upload a JPG, PNG, or WEBP image up to 5MB.", 400);

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
    const monthKey = getAlgiersMonthKey();
    const publicId = createRunClubPublicId(monthKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: publicId, timestamp };
    const signature = signCloudinaryParams(params, apiSecret);
    return NextResponse.json({ ok: true, cloudName, apiKey, timestamp, signature, publicId, folder: `run213/run-club/pending/${monthKey}` });
  } catch {
    return safeApiError("upload_failed", "Proof upload is not available right now.", 503);
  }
}
