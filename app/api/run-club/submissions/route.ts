import { NextResponse, type NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { createRunClubPendingFolder, getCloudinaryEnv, verifyUploadSignature } from "@/lib/run-club/cloudinary";
import { checkRunClubRateLimit, createIdentityHash, createSubmitterHash, getAlgiersMonthKey, safeApiError } from "@/lib/run-club/security";
import { normalizeInstagram } from "@/lib/run-club/instagram";
import { getContactType, normalizeContact, runClubSubmissionSchema, RUN_CLUB_MAX_IMAGE_BYTES } from "@/lib/run-club/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rateLimit;
  try { rateLimit = await checkRunClubRateLimit(request); } catch { return safeApiError("firestore_failed", "Submission is temporarily unavailable. Try again later.", 503); }
  if (!rateLimit.allowed) return safeApiError("rate_limited", "Too many submission attempts. Try again later.", 429);

  const body: unknown = await request.json().catch(() => null);
  const parsed = runClubSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid value."]));
    return safeApiError("validation_failed", "Check the form fields and try again.", 400, fieldErrors);
  }
  if (parsed.data.website) return safeApiError("validation_failed", "Check the form fields and try again.", 400);

  const monthKey = getAlgiersMonthKey();
  const expectedFolder = createRunClubPendingFolder(monthKey);
  const image = parsed.data.proofImage;
  if (!image.publicId.startsWith(`${expectedFolder}/`) || image.bytes > RUN_CLUB_MAX_IMAGE_BYTES) {
    return safeApiError("invalid_image", "Upload a valid Run Club proof image.", 400);
  }

  try {
    const { apiSecret } = getCloudinaryEnv();
    if (!verifyUploadSignature({ publicId: image.publicId, version: image.version, signature: image.signature }, apiSecret)) {
      return safeApiError("cloudinary_verification_failed", "Proof image could not be verified. Upload it again.", 400);
    }
  } catch {
    return safeApiError("cloudinary_verification_failed", "Proof image could not be verified. Upload it again.", 503);
  }

  const normalizedContact = normalizeContact(parsed.data.contact);
  const contactType = getContactType(normalizedContact);
  const normalizedInstagram = normalizeInstagram(parsed.data.instagram);
  const contactHash = createIdentityHash(monthKey, "contact", normalizedContact);
  const instagramHash = normalizedInstagram ? createIdentityHash(monthKey, "instagram", normalizedInstagram) : null;
  const submitterHash = createSubmitterHash(monthKey, normalizedContact);
  const submissionId = `${monthKey}_${submitterHash}`;
  const db = getAdminDb();
  const ref = db.collection("runClubSubmissions").doc(submissionId);
  const contactLockRef = db.collection("runClubSubmissionKeys").doc(`${monthKey}_contact_${contactHash}`);
  const instagramLockRef = instagramHash ? db.collection("runClubSubmissionKeys").doc(`${monthKey}_instagram_${instagramHash}`) : null;

  try {
    await db.runTransaction(async (transaction) => {
      const [existing, contactLock, instagramLock] = await Promise.all([transaction.get(ref), transaction.get(contactLockRef), instagramLockRef ? transaction.get(instagramLockRef) : Promise.resolve(null)]);
      if (existing.exists || contactLock.exists) throw new Error("DUPLICATE_CONTACT");
      if (instagramLock?.exists) throw new Error("DUPLICATE_INSTAGRAM");
      transaction.create(ref, {
        id: submissionId, monthKey, status: "pending", name: parsed.data.name, contactType, contactValue: parsed.data.contact.trim(), normalizedContact, submitterHash, normalizedInstagram, instagramHash,
        instagram: parsed.data.instagram, wilaya: parsed.data.wilaya, caption: parsed.data.caption, publicName: parsed.data.name, publicCaption: parsed.data.caption, publicWilaya: parsed.data.wilaya,
        proofImage: { publicId: image.publicId, secureUrl: image.secureUrl, width: image.width, height: image.height, format: image.format, bytes: image.bytes },
        consentAccepted: true, source: "web", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(contactLockRef, { type: "contact", monthKey, identityHash: contactHash, submissionId, createdAt: FieldValue.serverTimestamp() });
      if (instagramLockRef && instagramHash) transaction.create(instagramLockRef, { type: "instagram", monthKey, identityHash: instagramHash, submissionId, createdAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ ok: true, submissionId, status: "pending" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_CONTACT") return safeApiError("duplicate_submission", "You already submitted a run for this month.", 409);
    if (error instanceof Error && error.message === "DUPLICATE_INSTAGRAM") return safeApiError("duplicate_submission", "This Instagram account has already been used for a submission this month.", 409);
    console.error("[run-club-submissions] Firestore create failed.");
    return safeApiError("firestore_failed", "Submission could not be saved. Try again later.", 503);
  }
}
