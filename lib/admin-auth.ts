import { getAdminAuth } from "@/lib/firebase/admin";

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

export type AdminVerification =
  | { ok: true; admin: VerifiedAdmin }
  | { ok: false; response: Response };

/**
 * Canonical Admin authorization boundary.
 *
 * Authentication failures intentionally return 401, while a valid Firebase
 * session without the custom Admin claim returns 403. No email or client-side
 * value participates in authorization.
 */
export async function verifyAdminRequest(request: Request): Promise<AdminVerification> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);

  if (!match) {
    return denied("Authentication required.", 401);
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(match[1]);

    if (decodedToken.admin !== true) {
      return denied("Admin access required.", 403);
    }

    return {
      ok: true,
      admin: {
        uid: decodedToken.uid,
        email: decodedToken.email?.trim().toLowerCase() ?? "",
      },
    };
  } catch {
    return denied("Authentication required.", 401);
  }
}

function denied(message: string, status: 401 | 403): AdminVerification {
  return { ok: false, response: adminJsonError(message, status) };
}

export function adminJsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}
