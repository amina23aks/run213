"use client";

import { use } from "react";
import { AdminOrderDetailClient } from "@/components/admin/orders/AdminOrderDetailClient";

type AdminOrderDetailPageProps = { params: Promise<{ orderId: string }> };
export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { orderId } = use(params);
  return <AdminOrderDetailClient orderId={orderId} />;
}
