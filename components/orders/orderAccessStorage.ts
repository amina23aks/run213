const KEY = "run213:guestOrderAccess:v1";
const MAX_ENTRIES = 12;
export type StoredOrderAccess = { orderId: string; token: string; orderNumber?: string; createdAt: string };
export function saveGuestOrderAccess(entry: Omit<StoredOrderAccess, "createdAt">) { if (typeof window === "undefined") return; const entries = getGuestOrderAccess().filter((item) => item.orderId !== entry.orderId); entries.unshift({ ...entry, createdAt: new Date().toISOString() }); localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES))); }
export function getGuestOrderAccess() {
  if (typeof window === "undefined") return [] as StoredOrderAccess[];
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    return data.flatMap((value): StoredOrderAccess[] => {
      if (typeof value !== "object" || value === null) return [];
      const entry = value as Record<string, unknown>;
      if (typeof entry.orderId !== "string" || !entry.orderId || typeof entry.token !== "string" || !entry.token || seen.has(entry.orderId)) return [];
      seen.add(entry.orderId);
      return [{ orderId: entry.orderId, token: entry.token, orderNumber: typeof entry.orderNumber === "string" ? entry.orderNumber : undefined, createdAt: typeof entry.createdAt === "string" ? entry.createdAt : "" }];
    }).slice(0, MAX_ENTRIES);
  } catch { return []; }
}
export function getGuestOrderToken(orderId: string) { return getGuestOrderAccess().find((entry) => entry.orderId === orderId)?.token ?? null; }
export function removeGuestOrderAccess(orderId: string) { if (typeof window === "undefined") return; const next = getGuestOrderAccess().filter((entry) => entry.orderId !== orderId); localStorage.setItem(KEY, JSON.stringify(next)); }
export function guestAccessHeader() { return getGuestOrderAccess().map((entry) => `${entry.orderId}:${entry.token}`).join(","); }
