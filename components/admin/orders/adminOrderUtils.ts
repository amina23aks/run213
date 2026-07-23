import type { AdminOrderStatus } from "@/components/admin/orders/types";

export const STATUS_OPTIONS: Array<{ label: string; value: "all" | AdminOrderStatus }> = [
  { label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Confirmed", value: "confirmed" }, { label: "Shipped", value: "shipped" }, { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" }, { label: "Returned", value: "returned" },
];
export const NEXT_STATUS: Record<AdminOrderStatus, AdminOrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["shipped", "cancelled"], preparing: ["shipped", "cancelled"], shipped: ["delivered", "returned"], delivered: ["returned"], cancelled: [], returned: [] };
export function formatAdminDate(value: string | null) { if (!value) return "Unknown"; const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date) : "Unknown"; }
export function formatDzdValue(value: number | null) { return typeof value === "number" ? new Intl.NumberFormat("en-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(value) : "Cost unavailable"; }
export function statusClass(status: string) { return `adminOrderStatus adminOrderStatus--${status}`; }
