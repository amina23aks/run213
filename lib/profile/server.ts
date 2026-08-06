import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { VerifiedCustomer } from "@/lib/customer-auth";
import { z } from "zod";

const safeString = (value: unknown) => typeof value === "string" ? value : "";
export const displayNameSchema = z.object({ displayName: z.string().trim().min(2, "Enter your display name.").max(80, "Display name is too long.") }).strict();

export async function readCustomerProfile(customer: VerifiedCustomer) {
  const [authUser, snapshot] = await Promise.all([getAdminAuth().getUser(customer.uid), getAdminDb().collection("users").doc(customer.uid).get()]);
  const data = snapshot.data() ?? {};
  return {
    identity: { displayName: authUser.displayName ?? (safeString(data.displayName || data.fullName) || null), email: authUser.email ?? customer.email, createdAt: authUser.metadata.creationTime ?? null },
  };
}

export async function writeCustomerProfile(customer: VerifiedCustomer, input: unknown) {
  const { displayName } = displayNameSchema.parse(input);
  await Promise.all([
    getAdminAuth().updateUser(customer.uid, { displayName }),
    getAdminDb().collection("users").doc(customer.uid).set({ displayName, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  ]);
  return readCustomerProfile(customer);
}
