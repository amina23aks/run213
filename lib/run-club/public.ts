import "server-only";
import { unstable_cache } from "next/cache";
import type { Timestamp } from "firebase-admin/firestore";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAlgiersMonthKey } from "@/lib/run-club/security";
import { RUN_CLUB_MAX_APPROVED, type PublicRunClubEntry } from "@/lib/run-club/types";

export const getPublicRunClubEntries = unstable_cache(async (limit = 12): Promise<PublicRunClubEntry[]> => {
  if (getMissingFirebaseAdminEnv().length) return [];
  const snapshot = await getAdminDb().collection("runClubSubmissions").where("status", "==", "approved").orderBy("approvedAt", "desc").limit(limit).get();
  return snapshot.docs.map(serializePublicEntry).filter((entry): entry is PublicRunClubEntry => entry !== null);
}, ["public-run-club-entries"], { revalidate: 60, tags: ["run-club"] });

export const getRunClubMonthStatus = unstable_cache(async (monthKey = getAlgiersMonthKey()) => {
  if (getMissingFirebaseAdminEnv().length) return { monthKey, monthLabel: formatMonthLabel(monthKey), approvedCount: 0, maximumApprovedParticipants: RUN_CLUB_MAX_APPROVED, status: "open" as const };
  const doc = await getAdminDb().collection("runClubMonths").doc(monthKey).get();
  if (!doc.exists) return { monthKey, monthLabel: formatMonthLabel(monthKey), approvedCount: 0, maximumApprovedParticipants: RUN_CLUB_MAX_APPROVED, status: "open" as const };
  const approvedCount = Math.max(0, Math.min(Number(doc.get("approvedCount") ?? 0), RUN_CLUB_MAX_APPROVED));
  return { monthKey, monthLabel: formatMonthLabel(monthKey), approvedCount, maximumApprovedParticipants: RUN_CLUB_MAX_APPROVED, status: approvedCount >= RUN_CLUB_MAX_APPROVED ? "full" as const : "open" as const };
}, ["run-club-month-status"], { revalidate: 60, tags: ["run-club"] });

export function serializePublicEntry(doc: FirebaseFirestore.QueryDocumentSnapshot): PublicRunClubEntry | null {
  const data = doc.data();
  if (data.status !== "approved") return null;
  const proof = data.proofImage;
  if (!proof || typeof proof.secureUrl !== "string") return null;
  const approvedAt = data.approvedAt as Timestamp | undefined;
  return { id: doc.id, publicName: String(data.publicName || data.name || "Runner"), publicCaption: typeof data.publicCaption === "string" ? data.publicCaption : null, publicWilaya: typeof data.publicWilaya === "string" ? data.publicWilaya : null, proofImage: { secureUrl: proof.secureUrl, width: Number(proof.width || 1), height: Number(proof.height || 1) }, approvedAt: approvedAt?.toDate().toISOString() ?? new Date(0).toISOString() };
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Africa/Algiers" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
