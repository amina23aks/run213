import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { DurableRateLimitUnavailableError } from "@/lib/rate-limit";
import { getWishlistDocumentId, normalizeWishlistEmail } from "@/lib/wishlist/identity";
import { checkWishlistRateLimits } from "@/lib/wishlist/rateLimit";

const schema = z.object({
  email: z.string().trim().email().max(254),
  website: z.string().max(500).optional().default(""),
}).strict();

const successBody = { ok: true, message: "You're on the list." } as const;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (parsed.data.website.trim()) return Response.json({ error: "Could not process this request." }, { status: 400 });

  const email = normalizeWishlistEmail(parsed.data.email);
  try {
    const rateLimit = await checkWishlistRateLimits({ ip: getClientIp(request), normalizedEmail: email });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000));
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }

    const ref = getAdminDb().collection("wishlistSignups").doc(getWishlistDocumentId(email));
    await getAdminDb().runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists) transaction.create(ref, { email, createdAt: FieldValue.serverTimestamp() });
    });
    return Response.json(successBody);
  } catch (error) {
    if (error instanceof DurableRateLimitUnavailableError) {
      return Response.json({ error: "Signup is temporarily unavailable. Please try again later." }, { status: 503 });
    }
    console.error("Wishlist signup failed");
    return Response.json({ error: "Could not process this request." }, { status: 503 });
  }
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
