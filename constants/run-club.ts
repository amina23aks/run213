export type RunClubMonthStatus = {
  monthKey: string;
  monthLabel: string;
  approvedCount: number;
  maximumApprovedParticipants: 26;
  status: "open" | "closed";
};

export type ApprovedCommunityEntry = {
  id: string;
  name: string;
  location: string;
  distance: string;
  image: string;
  note: string;
};

export const currentRunClubMonth: RunClubMonthStatus = {
  monthKey: "2026-07",
  monthLabel: "July 2026",
  approvedCount: 18,
  maximumApprovedParticipants: 26,
  status: "open",
};

export const approvedCommunityEntries: ApprovedCommunityEntry[] = [
  { id: "summer-road-01", name: "Yacine", location: "Algiers", distance: "4.2 KM", image: "/model.png", note: "NO NEED TO BE FAST." },
  { id: "city-streak-02", name: "Meriem", location: "Oran", distance: "3.0 KM", image: "/bottompart.png", note: "JUST SHOW UP." },
  { id: "evening-run-03", name: "Amine", location: "Constantine", distance: "5.6 KM", image: "/top.png", note: "ONE MORE KILOMETER." },
  { id: "morning-build-04", name: "Lina", location: "Blida", distance: "2.8 KM", image: "/tshirt.png", note: "RUN YOUR PACE." },
  { id: "road-proof-05", name: "Sami", location: "Tizi Ouzou", distance: "6.1 KM", image: "/road.png", note: "EVERY STEP BUILDS YOU." },
];
