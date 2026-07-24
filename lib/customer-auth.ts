import "server-only";

import { getAdminAuth } from "@/lib/firebase/admin";

export type VerifiedCustomer = { uid: string; email: string | null };
export class CustomerAuthError extends Error { constructor(public code: string, message: string, public status = 401) { super(message); this.name = "CustomerAuthError"; } }

export async function verifyOptionalCustomerRequest(request: Request): Promise<VerifiedCustomer | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(match[1]);
    return { uid: decoded.uid, email: decoded.email?.trim().toLowerCase() ?? null };
  } catch {
    throw new CustomerAuthError("invalid_auth_token", "Your session expired. Please sign in again.", 401);
  }
}

export async function requireCustomerRequest(request: Request): Promise<VerifiedCustomer> {
  const customer = await verifyOptionalCustomerRequest(request);
  if (!customer) throw new CustomerAuthError("auth_required", "Sign in to continue.", 401);
  return customer;
}
