"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const adminNavItems = [
  { label: "Overview", href: "/admin", status: "ready" },
  { label: "Orders", href: "#orders-coming-soon", status: "soon" },
  { label: "Products", href: "/admin/products", status: "ready" },
  { label: "Favorites", href: "#favorites-coming-soon", status: "soon" },
  { label: "Wishlist", href: "#wishlist-coming-soon", status: "soon" },
  { label: "Settings", href: "#settings-coming-soon", status: "soon" },
] as const;

type AdminShellProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function AdminShell({ title, eyebrow = "213 RUN ADMIN", description, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <main className="adminShell">
      <aside className="adminSidebar" aria-label="Admin navigation">
        <Link className="adminSidebar__brand" href="/admin/products">
          <span>213</span>
          <strong>RUN ADMIN</strong>
        </Link>
        <nav className="adminSidebar__nav">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.status === "soon") {
              return (
                <button className="adminSidebar__item isDisabled" type="button" key={item.label} aria-disabled="true">
                  <span>{item.label}</span>
                  <small>soon</small>
                </button>
              );
            }

            return (
              <Link className={isActive ? "adminSidebar__item isActive" : "adminSidebar__item"} href={item.href} key={item.label}>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <p className="adminSidebar__note">Built. Not found. Manage only what is ready for this sprint.</p>
      </aside>

      <section className="adminMain">
        <header className="adminMain__header">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          {description ? <span>{description}</span> : null}
        </header>
        {children}
      </section>
    </main>
  );
}
