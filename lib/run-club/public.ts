import "server-only";
import { unstable_cache } from "next/cache";
import type { Timestamp } from "firebase-admin/firestore";
import { getMissingFirebaseAdminEnv } from "@/lib/env";
import { getAdminDb } from "@/lib/firebase/admin";
import { dedupePublicRunClubEntries, normalizeMonthStatus, serializePublicWinner } from "@/lib/run-club/draw";
import { getAlgiersMonthKey } from "@/lib/run-club/security";
import { RUN_CLUB_MAX_APPROVED, type PublicRunClubEntry, type PublicRunClubWinner } from "@/lib/run-club/types";

export const getPublicRunClubEntries = unstable_cache(async (limit = 12): Promise<PublicRunClubEntry[]> => {
  if (getMissingFirebaseAdminEnv().length) return [];
  const snapshot = await getAdminDb().collection("runClubSubmissions").where("status", "==", "approved").orderBy("approvedAt", "desc").limit(Math.max(limit * 3, limit)).get();
  return dedupePublicRunClubEntries(snapshot.docs.map(serializePublicEntry).filter((entry): entry is PublicRunClubEntry => entry !== null)).slice(0, limit);
}, ["public-run-club-entries"], { revalidate: 60, tags: ["run-club"] });

export const getRunClubMonthStatus = unstable_cache(async (monthKey = getAlgiersMonthKey()) => {
  if (getMissingFirebaseAdminEnv().length) return { ...normalizeMonthStatus(monthKey, undefined, RUN_CLUB_MAX_APPROVED), monthLabel: formatMonthLabel(monthKey) };
  const doc = await getAdminDb().collection("runClubMonths").doc(monthKey).get();
  return { ...normalizeMonthStatus(monthKey, doc.exists ? doc.data() : undefined, RUN_CLUB_MAX_APPROVED), monthLabel: formatMonthLabel(monthKey) };
}, ["run-club-month-status"], { revalidate: 60, tags: ["run-club"] });

export const getPublicRunClubWinner = unstable_cache(async (monthKey = getAlgiersMonthKey()): Promise<PublicRunClubWinner | null> => {
  if (getMissingFirebaseAdminEnv().length) return null;
  const db = getAdminDb();
  const monthDoc = await db.collection("runClubMonths").doc(monthKey).get();
  const winnerSubmissionId = monthDoc.exists && typeof monthDoc.get("winnerSubmissionId") === "string" ? monthDoc.get("winnerSubmissionId") as string : null;
  if (!winnerSubmissionId) return null;
  const submissionDoc = await db.collection("runClubSubmissions").doc(winnerSubmissionId).get();
  if (!submissionDoc.exists) return null;
  return serializePublicWinner(submissionDoc.id, submissionDoc.data() ?? {}, monthKey, monthDoc.get("winnerSelectedAt"));
}, ["public-run-club-winner"], { revalidate: 60, tags: ["run-club"] });

export function serializePublicEntry(doc: FirebaseFirestore.QueryDocumentSnapshot): PublicRunClubEntry | null {
  const data = doc.data();
  if (data.status !== "approved") return null;
  const proof = data.proofImage;
  if (!proof || typeof proof.secureUrl !== "string") return null;
  const approvedAt = data.approvedAt as Timestamp | undefined;
  return { id: doc.id, publicName: String(data.publicName || data.name || "Runner"), publicCaption: typeof data.publicCaption === "string" ? data.publicCaption : null, publicWilaya: typeof data.publicWilaya === "string" ? data.publicWilaya : null, proofImage: { secureUrl: proof.secureUrl, width: Number(proof.width || 1), height: Number(proof.height || 1), publicId: typeof proof.publicId === "string" ? proof.publicId : null }, approvedAt: approvedAt?.toDate().toISOString() ?? new Date(0).toISOString(), isWinner: data.isWinner === true, winnerMonthKey: typeof data.winnerMonthKey === "string" ? data.winnerMonthKey : null };
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Africa/Algiers" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
