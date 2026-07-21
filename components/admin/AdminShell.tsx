"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react";

const adminNavItems = [
  { label: "Overview", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Look Collections", href: "/admin/look-collections" },
  { label: "Looks", href: "/admin/looks" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Run Club", href: "/admin/run-club" },
  { label: "Favorites", href: "/admin/favorites" },
  { label: "Wishlist", href: "/admin/wishlist" },
  { label: "Settings", href: "/admin/settings" },
] as const;

type AdminShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function AdminShell({ title, eyebrow = "213 RUN ADMIN", description, children }: AdminShellProps) {
  const pathname = usePathname();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const activeLabel = useMemo(() => {
    return adminNavItems.find((item) => isActiveAdminPath(pathname, item.href))?.label ?? "Admin";
  }, [pathname]);

  useEffect(() => {
    startTransition(() => setIsNavOpen(false));
  }, [pathname]);

  const closeNav = useCallback(() => {
    startTransition(() => setIsNavOpen(false));
  }, []);

  return (
    <main className="adminShell">
      <aside className="adminSidebar" aria-label="Admin navigation">
        <div className="adminSidebar__topline">
          <Link className="adminSidebar__brand" href="/admin" onClick={closeNav}>
            <span>213</span>
            <strong>RUN ADMIN</strong>
          </Link>

          <button
            className="adminSidebar__toggle"
            type="button"
            aria-expanded={isNavOpen}
            aria-controls="admin-navigation"
            onClick={() => setIsNavOpen((current) => !current)}
          >
            <span>{isNavOpen ? "Close" : "Menu"}</span>
            <strong aria-hidden="true">{isNavOpen ? "×" : "☰"}</strong>
          </button>
        </div>

        <div className="adminSidebar__summary">
          <p>Control center</p>
          <span>{activeLabel}</span>
        </div>

        <nav id="admin-navigation" className={isNavOpen ? "adminSidebar__nav isOpen" : "adminSidebar__nav"}>
          {adminNavItems.map((item) => (
            <AdminNavLink
              href={item.href}
              isActive={isActiveAdminPath(pathname, item.href)}
              key={item.href}
              label={item.label}
              onClick={closeNav}
            />
          ))}
        </nav>

        <div className="adminSidebar__footer">
          <p className="adminSidebar__note">BUILT. NOT FOUND. Keep the operations clean, focused, and ready for every drop.</p>
        </div>
      </aside>

      <section className="adminMain">
        <header className="adminMain__header">
          <div>
            <p>{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {description ? <span>{description}</span> : null}
        </header>
        <div className="adminMain__content">{children}</div>
      </section>
    </main>
  );
}

function isActiveAdminPath(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const AdminNavLink = memo(function AdminNavLink({
  href,
  label,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link className={isActive ? "adminSidebar__item isActive" : "adminSidebar__item"} href={href} onClick={onClick}>
      <span>{label}</span>
      <small aria-hidden="true">→</small>
    </Link>
  );
});

export function AdminShellLoader({ title = "Loading admin", subtitle = "Preparing the 213 RUN control center." }: { title?: string; subtitle?: string }) {
  return (
    <main className="adminShell adminShell--loading">
      <section className="adminLoader" role="status" aria-live="polite">
        <span className="adminLoader__spinner" aria-hidden="true" />
        <div>
          <p>{title}</p>
          <span>{subtitle}</span>
        </div>
      </section>
    </main>
  );
}
