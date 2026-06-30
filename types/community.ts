export type CommunitySubmissionStatus = "pending" | "approved" | "rejected";

export type CommunitySubmission = {
  id: string;
  runnerName: string;
  city: string;
  distanceKm: number;
  runDate: string;
  proofPublicId: string;
  status: CommunitySubmissionStatus;
};
