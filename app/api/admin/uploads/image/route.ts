import { createHash } from "crypto";
import { adminJsonError, verifyAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLOUDINARY_FOLDER = "run213/products";

type CloudinaryUploadResponse = {
  secure_url?: unknown;
  public_id?: unknown;
  error?: { message?: string };
};

export async function POST(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return adminJsonError("Unauthorized", 401);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return adminJsonError("Cloudinary is not configured.", 503);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return adminJsonError("Choose an image file to upload.", 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return adminJsonError("Upload a JPG, PNG, or WEBP image.", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return adminJsonError("Image must be 5MB or smaller.", 400);
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createCloudinarySignature({ folder: CLOUDINARY_FOLDER, timestamp }, apiSecret);
  const uploadFormData = new FormData();
  uploadFormData.append("file", file, file.name || "product-image");
  uploadFormData.append("api_key", apiKey);
  uploadFormData.append("timestamp", timestamp);
  uploadFormData.append("folder", CLOUDINARY_FOLDER);
  uploadFormData.append("signature", signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadFormData,
    });
    const payload = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      console.error("[admin-upload] Cloudinary image upload failed.");
      return adminJsonError(getCloudinaryErrorMessage(payload), response.status);
    }

    if (typeof payload.secure_url !== "string" || typeof payload.public_id !== "string") {
      console.error("[admin-upload] Cloudinary image upload returned an invalid payload.");
      return adminJsonError("Image upload failed. Try again.", 502);
    }

    return Response.json({ secureUrl: payload.secure_url, publicId: payload.public_id });
  } catch {
    console.error("[admin-upload] Cloudinary image upload request failed.");
    return adminJsonError("Image upload failed. Try again.", 502);
  }
}

function createCloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const source = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${source}${apiSecret}`).digest("hex");
}

function getCloudinaryErrorMessage(payload: CloudinaryUploadResponse) {
  return typeof payload.error?.message === "string" && payload.error.message.trim()
    ? payload.error.message
    : "Image upload failed. Try again.";
}
