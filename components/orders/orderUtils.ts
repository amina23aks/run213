export function formatDzd(value: number | null | undefined) { return typeof value === "number" ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} DZD` : "—"; }
export function formatOrderDate(value: string | null | undefined) { if (!value) return "Unknown"; const d = new Date(value); return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat("en", { timeZone: "Africa/Algiers", dateStyle: "medium", timeStyle: "short" }).format(d) : "Unknown"; }
export function orderStatusClass(status: string) { return `customerStatus customerStatus--${status}`; }
