import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { VerifiedCustomer } from "@/lib/customer-auth";
import { customerProfileSchema, type ProfileInput } from "@/lib/profile/validation";
import type { CustomerProfile } from "@/types/profile";

const safeString = (value: unknown) => typeof value === "string" ? value : "";

export async function readCustomerProfile(customer: VerifiedCustomer) {
  const [authUser, snapshot] = await Promise.all([getAdminAuth().getUser(customer.uid), getAdminDb().collection("users").doc(customer.uid).get()]);
  const data = snapshot.data() ?? {};
  const defaults = typeof data.checkoutDefaults === "object" && data.checkoutDefaults ? data.checkoutDefaults as Record<string, unknown> : {};
  return {
    identity: { displayName: authUser.displayName ?? (safeString(data.fullName) || null), email: authUser.email ?? customer.email, photoURL: authUser.photoURL ?? null, createdAt: authUser.metadata.creationTime ?? null },
    defaults: { fullName: safeString(defaults.fullName || data.fullName), phone: safeString(defaults.phone || data.phone), wilaya: safeString(defaults.wilaya), address: safeString(defaults.address), deliveryMode: defaults.deliveryMode === "desk" ? "desk" : "home", notes: safeString(defaults.notes) } satisfies CustomerProfile,
  };
}

export async function writeCustomerProfile(customer: VerifiedCustomer, input: ProfileInput) {
  const defaults = customerProfileSchema.parse(input);
  await Promise.all([
    getAdminAuth().updateUser(customer.uid, { displayName: defaults.fullName }),
    getAdminDb().collection("users").doc(customer.uid).set({ fullName: defaults.fullName, phone: defaults.phone, checkoutDefaults: defaults, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ]);
  return readCustomerProfile(customer);
}
