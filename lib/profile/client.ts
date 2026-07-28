import type { User } from "firebase/auth";
import type { CustomerProfile } from "@/types/profile";

export type ProfileResponse = { identity: { displayName: string | null; email: string | null; photoURL: string | null; createdAt: string | null }; defaults: CustomerProfile };

async function requestProfile(user: User, init?: RequestInit): Promise<ProfileResponse> {
  const response = await fetch("/api/account/profile", { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}`, ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Account details are temporarily unavailable.");
  return body as ProfileResponse;
}
export const loadProfile = (user: User) => requestProfile(user);
export const saveProfile = (user: User, defaults: CustomerProfile) => requestProfile(user, { method: "PUT", body: JSON.stringify(defaults) });
