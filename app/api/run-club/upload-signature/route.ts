import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createRunClubPublicId, getCloudinaryEnv, signCloudinaryParams } from "@/lib/run-club/cloudinary";
import { checkMonthlyUidSubmission, getAlgiersMonthKey, getClientIp, safeApiError } from "@/lib/run-club/security";
import { isValidContact, RUN_CLUB_ALLOWED_MIME_TYPES, RUN_CLUB_MAX_IMAGE_BYTES } from "@/lib/run-club/validation";
import { CustomerAuthError, requireCustomerRequest } from "@/lib/customer-auth";
import { checkRunClubUploadLimits, createRunClubUploadGrant } from "@/lib/run-club/protection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({ fileType: z.enum(RUN_CLUB_ALLOWED_MIME_TYPES), fileSize: z.number().int().positive().max(RUN_CLUB_MAX_IMAGE_BYTES), contact: z.string().trim().refine(isValidContact), instagram: z.string().trim().max(60).optional().default(""), website: z.string().max(0).optional().default("") }).strict();

export async function POST(request: NextRequest) {
  let customer;
  try { customer = await requireCustomerRequest(request); }
  catch (error) { return safeApiError("validation_failed", error instanceof CustomerAuthError ? error.message : "Sign in to submit a run.", 401); }
  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return safeApiError("invalid_image", "Upload a JPG, PNG, or WEBP image up to 5MB.", 400);
  if (parsed.data.website) return safeApiError("validation_failed", "Check the form fields and try again.", 400);

  const monthKey = getAlgiersMonthKey();
  try {
    if (await checkMonthlyUidSubmission(monthKey, customer.uid)) return safeApiError("duplicate_submission", "You already submitted for this month.", 409);
  } catch { return safeApiError("firestore_failed", "Submission is temporarily unavailable. Try again later.", 503); }

  let uploadLimit;
  try { uploadLimit = await checkRunClubUploadLimits({ uid: customer.uid, ip: getClientIp(request) }); }
  catch { return safeApiError("upload_failed", "Proof upload is not available right now.", 503); }
  if (!uploadLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((uploadLimit.reset - Date.now()) / 1000));
    return Response.json({ ok: false, code: "rate_limited", message: "Too many upload attempts. Try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();
    const publicId = createRunClubPublicId(monthKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { public_id: publicId, timestamp };
    const signature = signCloudinaryParams(params, apiSecret);
    const uploadGrantId = await createRunClubUploadGrant({ uid: customer.uid, publicId, monthKey, fileType: parsed.data.fileType, declaredBytes: parsed.data.fileSize, maxBytes: RUN_CLUB_MAX_IMAGE_BYTES });
    return NextResponse.json({ ok: true, cloudName, apiKey, timestamp, signature, publicId, folder: `run213/run-club/pending/${monthKey}`, uploadGrantId });
  } catch {
    return safeApiError("upload_failed", "Proof upload is not available right now.", 503);
  }
}
