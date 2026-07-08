import { getAdminAuth, isConfiguredAdminEmail } from "@/lib/firebase/admin";

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

export async function verifyAdminRequest(request: Request): Promise<VerifiedAdmin | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(match[1]);
    const email = decodedToken.email?.trim().toLowerCase();

    if (!email || !isConfiguredAdminEmail(email)) {
      return null;
    }

    return { uid: decodedToken.uid, email };
  } catch {
    return null;
  }
}

export function adminJsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
