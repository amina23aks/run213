import type { Timestamp } from "firebase-admin/firestore";

export const RUN_CLUB_MAX_APPROVED = 26;
export type RunClubSubmissionStatus = "pending" | "approved" | "rejected";
export type PublicRunClubEntry = { id: string; publicName: string; publicCaption: string | null; publicWilaya: string | null; proofImage: { secureUrl: string; width: number; height: number; publicId?: string | null }; approvedAt: string; isWinner?: boolean; winnerMonthKey?: string | null; winnerPlacement?: number };
export type RunClubDrawStatus = "not_drawn" | "drawn";
export type RunClubWinnerSelection = { submissionId: string; placement: number; selectedAt: Timestamp; selectedBy: string; eligibleCountAtSelection: number };
export type RunClubMonth = { monthKey: string; approvedCount: number; maximumApproved: 26; status: "open" | "full"; drawStatus?: RunClubDrawStatus; winnerSubmissionId?: string | null; winnerSubmissionIds?: string[]; winnerSelectedAt?: Timestamp | null; winnerSelectedBy?: string | null; winnerCount?: number; eligibleCountAtDraw?: number | null; winnerSelections?: RunClubWinnerSelection[]; drawVersion?: number; updatedAt?: Timestamp };
export type RunClubMonthStatus = { monthKey: string; monthLabel?: string; approvedCount: number; maximumApprovedParticipants: number; status: "open" | "full"; drawStatus: RunClubDrawStatus; winnerSubmissionId: string | null; winnerSubmissionIds: string[]; winnerSelectedAt: string | null; eligibleCountAtDraw: number | null; winnerCount: number; drawVersion?: number };
export type PublicRunClubWinner = { submissionId: string; publicName: string; publicCaption: string | null; publicWilaya: string | null; proofImage: { secureUrl: string; width: number; height: number }; monthKey: string; winnerSelectedAt: string; placement?: number };
