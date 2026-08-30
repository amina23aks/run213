import type { CartItem } from "@/types/cart";
import type { CreateOrderResponse } from "@/types/order";

export const ANALYTICS_CONSENT_KEY = "run213-analytics-consent";
export type AnalyticsConsent = "allowed" | "denied" | "unknown";

type AnalyticsItem = { item_id: string; item_name: string; price?: number; quantity?: number; item_category?: string; item_variant?: string };
type EventParams = { currency?: "DZD"; value?: number; transaction_id?: string; shipping_tier?: string; items?: AnalyticsItem[] };

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; [key: `ga-disable-${string}`]: boolean | undefined } }

const PUBLIC_PAGE_VIEW_PATHS = new Set(["/", "/shop", "/run-club", "/about", "/shipping", "/returns", "/faq", "/privacy", "/terms"]);
const PUBLIC_PAGE_VIEW_PREFIXES = ["/product/", "/look/", "/looks/"];

export function cleanAnalyticsPath(pathname: string): string {
  const cleanPath = pathname.split(/[?#]/, 1)[0] || "/";
  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
}

export function isPublicPageViewPath(pathname: string): boolean {
  const cleanPath = cleanAnalyticsPath(pathname);
  return PUBLIC_PAGE_VIEW_PATHS.has(cleanPath) || PUBLIC_PAGE_VIEW_PREFIXES.some((prefix) => cleanPath.startsWith(prefix));
}

export function isAdminAnalyticsPath(pathname: string): boolean {
  const cleanPath = cleanAnalyticsPath(pathname);
  return cleanPath === "/admin" || cleanPath.startsWith("/admin/");
}

export function readAnalyticsConsent(storage: Pick<Storage, "getItem"> | null = typeof window === "undefined" ? null : window.localStorage): AnalyticsConsent {
  const value = storage?.getItem(ANALYTICS_CONSENT_KEY);
  return value === "allowed" || value === "denied" ? value : "unknown";
}

export function writeAnalyticsConsent(value: Exclude<AnalyticsConsent, "unknown">, storage: Pick<Storage, "setItem"> = window.localStorage) {
  storage.setItem(ANALYTICS_CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent("run213:analytics-consent", { detail: value }));
}

export function cartAnalyticsItems(items: CartItem[]): AnalyticsItem[] {
  return items.map((item) => ({
    item_id: item.lookId ?? item.productId,
    item_name: item.lookName ?? item.name,
    price: item.lookId ? item.lookPriceDzd : item.priceDzd,
    quantity: item.quantity,
    item_category: item.lookId ? "Look" : "Product",
    item_variant: [item.selectedColor, item.selectedSize].filter(Boolean).join(" / ") || undefined,
  }));
}

export function trackEvent(name: "view_item" | "add_to_cart" | "remove_from_cart" | "view_cart" | "begin_checkout" | "add_shipping_info" | "purchase" | "add_to_wishlist", params: EventParams) {
  if (typeof window === "undefined" || isAdminAnalyticsPath(window.location.pathname) || readAnalyticsConsent() !== "allowed" || !window.gtag) return false;
  window.gtag("event", name, params);
  return true;
}

export function trackPurchaseAfterSuccess(order: CreateOrderResponse, items: CartItem[]) {
  if (!order.orderId || !order.totals || typeof order.totals.totalDzd !== "number") return false;
  const key = `run213-ga-purchase:${order.orderId}`;
  if (window.sessionStorage.getItem(key)) return false;
  const sent = trackEvent("purchase", { transaction_id: order.orderId, currency: "DZD", value: order.totals.totalDzd, items: cartAnalyticsItems(items) });
  if (sent) window.sessionStorage.setItem(key, "1");
  return sent;
}
