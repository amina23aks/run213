import { randomInt } from "node:crypto";
import type { Timestamp } from "firebase-admin/firestore";
import type { PublicRunClubEntry, PublicRunClubWinner, RunClubDrawStatus, RunClubMonthStatus } from "@/lib/run-club/types";

export const RUN_CLUB_DRAW_VERSION = 1;

export function isValidMonthKey(monthKey: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return false;
  const month = Number(monthKey.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function selectSecureWinnerIndex(length: number): number {
  if (!Number.isInteger(length) || length <= 0) throw new Error("NO_ELIGIBLE_PARTICIPANTS");
  return randomInt(length);
}

export function isEligibleRunClubSubmission(data: FirebaseFirestore.DocumentData): boolean {
  const proof = data.proofImage;
  return data.status === "approved"
    && typeof data.monthKey === "string"
    && proof != null
    && typeof proof.secureUrl === "string"
    && proof.secureUrl.length > 0
    && typeof proof.publicId === "string"
    && proof.publicId.length > 0;
}

export function dedupePublicRunClubEntries<T extends PublicRunClubEntry>(entries: T[]): T[] {
  const seenIds = new Set<string>();
  const seenPublicIds = new Set<string>();
  const result: T[] = [];
  for (const entry of entries) {
    if (seenIds.has(entry.id)) continue;
    const publicId = entry.proofImage.publicId?.trim();
    if (publicId && seenPublicIds.has(publicId)) continue;
    seenIds.add(entry.id);
    if (publicId) seenPublicIds.add(publicId);
    result.push(entry);
  }
  return result;
}

export function getRunClubDrawStatus(data: FirebaseFirestore.DocumentData | undefined): RunClubDrawStatus {
  return data?.drawStatus === "drawn" || data?.winnerSubmissionId ? "drawn" : "not_drawn";
}

export function serializePublicWinner(submissionId: string, data: FirebaseFirestore.DocumentData, monthKey: string, winnerSelectedAt: Timestamp | string | Date | null | undefined): PublicRunClubWinner | null {
  if (!isEligibleRunClubSubmission({ ...data, monthKey, status: "approved" })) return null;
  const proof = data.proofImage;
  const selectedAt = toIso(winnerSelectedAt);
  if (!selectedAt) return null;
  return {
    submissionId,
    publicName: String(data.publicName || data.name || "Runner"),
    publicCaption: typeof data.publicCaption === "string" && data.publicCaption.trim() ? data.publicCaption : null,
    publicWilaya: typeof data.publicWilaya === "string" && data.publicWilaya.trim() ? data.publicWilaya : null,
    proofImage: { secureUrl: proof.secureUrl, width: Number(proof.width || 1), height: Number(proof.height || 1) },
    monthKey,
    winnerSelectedAt: selectedAt,
  };
}

export function normalizeMonthStatus(monthKey: string, data: FirebaseFirestore.DocumentData | undefined, maximumApprovedParticipants: number): RunClubMonthStatus {
  const approvedCount = Math.max(0, Math.min(Number(data?.approvedCount ?? 0), maximumApprovedParticipants));
  return {
    monthKey,
    approvedCount,
    maximumApprovedParticipants,
    status: approvedCount >= maximumApprovedParticipants ? "full" : "open",
    drawStatus: getRunClubDrawStatus(data),
    winnerSubmissionId: typeof data?.winnerSubmissionId === "string" ? data.winnerSubmissionId : null,
    winnerSelectedAt: toIso(data?.winnerSelectedAt),
    eligibleCountAtDraw: typeof data?.eligibleCountAtDraw === "number" ? data.eligibleCountAtDraw : null,
    drawVersion: typeof data?.drawVersion === "number" ? data.drawVersion : undefined,
  };
}

function toIso(value: Timestamp | string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}
