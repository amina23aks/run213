const PRIVATE_PAGE_VIEW_ROOTS = [
  "/admin",
  "/account",
  "/orders",
  "/cart",
  "/checkout",
  "/favorites",
  "/order-success",
  "/api",
];

function isPathAtOrBelow(pathname, root) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

/** Removes query parameters and fragments from an application path. */
export function cleanPathname(pathname) {
  return pathname.split(/[?#]/, 1)[0] || "/";
}

/** Returns whether a pathname is eligible for a consent-gated GA4 page_view. */
export function isPublicPageViewPath(pathname) {
  const cleanPath = cleanPathname(pathname);
  return cleanPath.startsWith("/") && !PRIVATE_PAGE_VIEW_ROOTS.some((root) => isPathAtOrBelow(cleanPath, root));
}

/** Admin pages never emit page views or ecommerce analytics. */
export function isAdminPath(pathname) {
  return isPathAtOrBelow(cleanPathname(pathname), "/admin");
}

/** Builds a query- and hash-free page location. */
export function cleanPageLocation(origin, pathname) {
  return `${origin}${cleanPathname(pathname)}`;
}
