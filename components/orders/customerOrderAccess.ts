import { onAuthStateChanged, type User } from "firebase/auth";
import { getGuestOrderToken, guestAccessHeader } from "@/components/orders/orderAccessStorage";

type AccessHeadersResult = { headers: Record<string, string>; authed: boolean; ready: boolean };

async function waitForAuthHydration(): Promise<User | null> {
  const { auth } = await import("@/lib/firebase/client");
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); resolve(user); });
  });
}

export async function getCustomerListHeaders(): Promise<AccessHeadersResult> {
  const user = await waitForAuthHydration();
  const token = await user?.getIdToken();
  if (token) return { headers: { Authorization: `Bearer ${token}` }, authed: true, ready: true };
  const access = guestAccessHeader();
  return { headers: access ? { "x-run213-order-access": access } : {}, authed: false, ready: true };
}

export async function getCustomerDetailHeaders(orderId: string): Promise<AccessHeadersResult> {
  const user = await waitForAuthHydration();
  const token = await user?.getIdToken();
  if (token) return { headers: { Authorization: `Bearer ${token}` }, authed: true, ready: true };
  const accessToken = getGuestOrderToken(orderId);
  return { headers: accessToken ? { "x-run213-order-token": accessToken } : {}, authed: false, ready: Boolean(accessToken) };
}
