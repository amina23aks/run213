import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { CustomerAuthError, requireCustomerRequest } from "@/lib/customer-auth";
import { createRunClubPendingFolder, getAuthoritativeCloudinaryImage } from "@/lib/run-club/cloudinary";
import { checkMonthlyUidSubmission, checkRunClubRateLimit, createUidMonthHash, getAlgiersMonthKey, safeApiError } from "@/lib/run-club/security";
import { normalizeInstagram } from "@/lib/run-club/instagram";
import { getContactType, normalizeContact, runClubSubmissionSchema, RUN_CLUB_ALLOWED_FORMATS, RUN_CLUB_MAX_IMAGE_BYTES } from "@/lib/run-club/validation";
import { consumeRunClubUploadGrant } from "@/lib/run-club/protection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let customerUserId: string;
  try { customerUserId = (await requireCustomerRequest(request)).uid; }
  catch (error) { return safeApiError("validation_failed", error instanceof CustomerAuthError ? error.message : "Sign in to submit a run.", error instanceof CustomerAuthError ? error.status : 401); }

  const body: unknown = await request.json().catch(() => null);
  const parsed = runClubSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid value."]));
    return safeApiError("validation_failed", "Check the form fields and try again.", 400, fieldErrors);
  }
  if (parsed.data.website) return safeApiError("validation_failed", "Check the form fields and try again.", 400);

  const monthKey = getAlgiersMonthKey();
  const normalizedContact = normalizeContact(parsed.data.contact);
  const contactType = getContactType(normalizedContact);
  const normalizedInstagram = normalizeInstagram(parsed.data.instagram);
  const uidMonthHash = createUidMonthHash(monthKey, customerUserId);

  try {
    if (await checkMonthlyUidSubmission(monthKey, customerUserId)) return safeApiError("duplicate_submission", "You already submitted for this month.", 409);
  } catch { return safeApiError("firestore_failed", "Submission is temporarily unavailable. Try again later.", 503); }

  let rateLimit;
  try { rateLimit = await checkRunClubRateLimit(request); } catch { return safeApiError("firestore_failed", "Submission is temporarily unavailable. Try again later.", 503); }
  if (!rateLimit.allowed) return safeApiError("rate_limited", "Too many submission attempts. Try again later.", 429);

  let grant;
  try { grant = await consumeRunClubUploadGrant(parsed.data.uploadGrantId); }
  catch { return safeApiError("upload_failed", "Proof upload is not available right now.", 503); }
  const expectedFolder = createRunClubPendingFolder(monthKey);
  const requestedImage = parsed.data.proofImage;
  if (!grant || grant.uid !== customerUserId || grant.publicId !== requestedImage.publicId || grant.monthKey !== monthKey || !requestedImage.publicId.startsWith(`${expectedFolder}/`)) {
    return safeApiError("invalid_image", "Upload a valid Run Club proof image.", 400);
  }

  let image;
  try {
    image = await getAuthoritativeCloudinaryImage(grant.publicId);
    const expectedFormats = grant.fileType === "image/jpeg" ? ["jpg", "jpeg"] : grant.fileType === "image/png" ? ["png"] : grant.fileType === "image/webp" ? ["webp"] : [];
    if (image.publicId !== grant.publicId || image.resourceType !== "image" || !RUN_CLUB_ALLOWED_FORMATS.includes(image.format as typeof RUN_CLUB_ALLOWED_FORMATS[number]) || !expectedFormats.includes(image.format) || image.bytes > grant.declaredBytes || image.bytes > grant.maxBytes || image.bytes > RUN_CLUB_MAX_IMAGE_BYTES || !image.secureUrl.startsWith("https://")) throw new Error("Invalid asset");
  } catch {
    return safeApiError("cloudinary_verification_failed", "Proof image could not be verified. Upload it again.", 400);
  }

  const submissionId = `${monthKey}_${uidMonthHash}`;
  const db = getAdminDb();
  const ref = db.collection("runClubSubmissions").doc(submissionId);
  const uidLockRef = db.collection("runClubSubmissionKeys").doc(`${monthKey}_uid_${uidMonthHash}`);
  const ownedSubmissionsQuery = db.collection("runClubSubmissions").where("customerUserId", "==", customerUserId).where("monthKey", "==", monthKey).limit(1);

  try {
    await db.runTransaction(async (transaction) => {
      const [existing, uidLock, ownedSubmissions] = await Promise.all([transaction.get(ref), transaction.get(uidLockRef), transaction.get(ownedSubmissionsQuery)]);
      if (existing.exists || uidLock.exists || !ownedSubmissions.empty) throw new Error("DUPLICATE_UID_MONTH");
      transaction.create(ref, {
        id: submissionId, monthKey, status: "pending", name: parsed.data.name, contactType, contactValue: parsed.data.contact.trim(), normalizedContact, uidMonthHash, normalizedInstagram,
        instagram: parsed.data.instagram, wilaya: parsed.data.wilaya, caption: parsed.data.caption, publicName: parsed.data.name, publicCaption: parsed.data.caption, publicWilaya: parsed.data.wilaya,
        proofImage: { publicId: image.publicId, secureUrl: image.secureUrl, width: image.width, height: image.height, format: image.format, bytes: image.bytes },
        consentAccepted: true, source: "web", customerUserId, publicVisible: false, moderationHistory: [{ action: "submitted", at: new Date().toISOString() }], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(uidLockRef, { type: "uid_month", monthKey, uidMonthHash, submissionId, createdAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ ok: true, submissionId, status: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_UID_MONTH") return safeApiError("duplicate_submission", "You already submitted for this month.", 409);
    console.error("[run-club-submissions] Firestore create failed.");
    return safeApiError("firestore_failed", "Submission could not be saved. Try again later.", 503);
  }
}
