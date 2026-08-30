const PUBLIC_PAGE_VIEW_PATHS = new Set([
  "/",
  "/shop",
  "/run-club",
  "/about",
  "/shipping",
  "/returns",
  "/faq",
  "/privacy",
  "/terms",
]);

const PUBLIC_PAGE_VIEW_ROOTS = ["/product", "/look", "/looks"];

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
  return PUBLIC_PAGE_VIEW_PATHS.has(cleanPath)
    || PUBLIC_PAGE_VIEW_ROOTS.some((root) => cleanPath.startsWith(`${root}/`));
}

/** Admin pages never emit page views or ecommerce analytics. */
export function isAdminPath(pathname) {
  return isPathAtOrBelow(cleanPathname(pathname), "/admin");
}

/** Builds a query- and hash-free page location. */
export function cleanPageLocation(origin, pathname) {
  return `${origin}${cleanPathname(pathname)}`;
}
