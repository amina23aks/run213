const KEY = "run213:guestOrderAccess:v1";
export type StoredOrderAccess = { orderId: string; token: string; orderNumber?: string; createdAt: string };
export function saveGuestOrderAccess(entry: Omit<StoredOrderAccess, "createdAt">) { if (typeof window === "undefined") return; const entries = getGuestOrderAccess().filter((item) => item.orderId !== entry.orderId); entries.unshift({ ...entry, createdAt: new Date().toISOString() }); localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 12))); }
export function getGuestOrderAccess() { if (typeof window === "undefined") return [] as StoredOrderAccess[]; try { const data = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(data) ? data.filter((x) => typeof x?.orderId === "string" && typeof x?.token === "string") : []; } catch { return []; } }
export function getGuestOrderToken(orderId: string) { return getGuestOrderAccess().find((entry) => entry.orderId === orderId)?.token ?? null; }
export function guestAccessHeader() { return getGuestOrderAccess().map((entry) => `${entry.orderId}:${entry.token}`).join(","); }
