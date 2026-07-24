import "server-only";

import { getAdminAuth } from "@/lib/firebase/admin";

export type VerifiedCustomer = { uid: string; email: string | null };

export async function verifyOptionalCustomerRequest(request: Request): Promise<VerifiedCustomer | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email?.trim().toLowerCase() ?? null };
  } catch {
    return null;
  }
}
