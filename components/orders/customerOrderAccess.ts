import { onAuthStateChanged, type User } from "firebase/auth";
import { getGuestOrderToken, guestAccessHeader } from "@/components/orders/orderAccessStorage";

type AccessHeadersResult = { headers: Record<string, string>; authed: boolean; ready: boolean; user: User | null };

export async function waitForAuthHydration(): Promise<User | null> {
  const { auth } = await import("@/lib/firebase/client");
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); resolve(user); });
  });
}

async function authHeaders(forceRefresh = false): Promise<AccessHeadersResult> {
  const user = await waitForAuthHydration();
  const token = await user?.getIdToken(forceRefresh);
  if (token) return { headers: { Authorization: `Bearer ${token}` }, authed: true, ready: true, user };
  return { headers: {}, authed: false, ready: true, user: null };
}

export async function getCustomerListHeaders(forceRefresh = false): Promise<AccessHeadersResult> {
  const access = await authHeaders(forceRefresh);
  if (access.authed) return access;
  const guest = guestAccessHeader();
  return { ...access, headers: guest ? { "x-run213-order-access": guest } : {} };
}

export async function getCustomerDetailHeaders(orderId: string, forceRefresh = false): Promise<AccessHeadersResult> {
  const access = await authHeaders(forceRefresh);
  if (access.authed) return access;
  const accessToken = getGuestOrderToken(orderId);
  return { ...access, headers: accessToken ? { "x-run213-order-token": accessToken } : {}, ready: Boolean(accessToken) };
}
