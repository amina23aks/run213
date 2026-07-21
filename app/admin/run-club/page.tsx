import { AdminRunClubClient } from "@/components/admin/AdminRunClubClient";
import { getAlgiersMonthKey } from "@/lib/run-club/security";

export default function AdminRunClubPage() {
  return <AdminRunClubClient defaultMonth={getAlgiersMonthKey()} />;
}
