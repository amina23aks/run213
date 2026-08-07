import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email;
  const id = Buffer.from(email).toString("base64url");
  const ref = getAdminDb().collection("wishlistSignups").doc(id);
  const existing = await ref.get();
  if (!existing.exists) await ref.create({ email, createdAt: FieldValue.serverTimestamp() });
  return Response.json({ joined: true });
}
