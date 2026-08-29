import type { ReactNode } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAccessGate>{children}</AdminAccessGate>;
}
