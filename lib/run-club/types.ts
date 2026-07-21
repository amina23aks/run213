import type { Timestamp } from "firebase-admin/firestore";

export const RUN_CLUB_MAX_APPROVED = 26;
export type RunClubSubmissionStatus = "pending" | "approved" | "rejected";
export type PublicRunClubEntry = { id: string; publicName: string; publicCaption: string | null; publicWilaya: string | null; proofImage: { secureUrl: string; width: number; height: number }; approvedAt: string };
export type RunClubMonth = { monthKey: string; approvedCount: number; maximumApproved: 26; status: "open" | "full"; updatedAt?: Timestamp };
