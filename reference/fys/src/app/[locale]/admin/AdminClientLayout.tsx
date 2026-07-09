"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react";

import { useAdmin } from "@/lib/admin";
import { useLocale } from "@/i18n/I18nProvider";
import { localizePathname } from "@/i18n/paths";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/favorites", label: "Favorites" },
  { href: "/admin/wishlist", label: "Wishlist" },
  { href: "/admin/contact", label: "Contact" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const localizedNavItems = useMemo(
    () => navItems.map((item) => ({ ...item, href: localizePathname(locale, item.href) })),
    [locale],
  );
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(localizePathname(locale, "/account"));
      return;
    }

    if (!isAdmin) {
      router.replace(localizePathname(locale, "/"));
    }
  }, [isAdmin, loading, locale, router, user]);

  useEffect(() => {
    startTransition(() => setIsNavOpen(false));
  }, [pathname]);

  const toggleNav = useCallback(() => {
    setIsNavOpen((prev) => !prev);
  }, []);

  const closeNav = useCallback(() => {
    startTransition(() => setIsNavOpen(false));
  }, []);

  if (loading) {
    return (
      <AdminLoader
        title="Checking admin access"
        subtitle="Hang tight while we verify your session."
      />
    );
  }

  if (!user || !isAdmin) {
    return (
      <AdminLoader
        title="Redirecting"
        subtitle="You need admin access to view this area."
      />
    );
  }

  return (
    <div className="admin-route-shell min-h-screen bg-gradient-to-b from-[#0b2e55] via-[#123f6f] to-[#0b2e55] px-3 py-8 sm:px-5 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row isolate overflow-x-hidden">
        <aside
          className="admin-shell-panel admin-shell-surface w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-5 text-sky-50 lg:w-64 lg:flex-shrink-0"
        >
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200">
                Admin
              </p>
              <h2 className="text-xl font-semibold text-white">
                Control center
              </h2>
              <p className="text-sm text-sky-100/80">Manage store operations</p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-sky-900/30 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70 lg:hidden"
              onClick={toggleNav}
            >
              <span>{isNavOpen ? "Close" : "Menu"}</span>
              <span className="text-lg leading-none">{isNavOpen ? "×" : "☰"}</span>
            </button>
          </div>

          <nav className={`${isNavOpen ? "block" : "hidden"} space-y-1 lg:block`}>
            {localizedNavItems.map((item) => {
              const isOverview = item.href.endsWith("/admin");
              const isActive = isOverview
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <AdminNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isActive}
                  onClick={closeNav}
                />
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div
            className="admin-shell-panel admin-shell-surface overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 text-sky-50 sm:p-6 lg:p-8"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminLoader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="admin-shell-panel admin-shell-surface flex items-center gap-4 rounded-3xl border border-white/10 bg-white/10 px-6 py-5 text-sky-50">
        <span className="h-11 w-11 animate-spin rounded-full border-4 border-white/60 border-t-transparent" />
        <div className="space-y-1">
          <p className="text-lg font-semibold text-white">{title}</p>
          {subtitle ? (
            <p className="text-sm text-sky-100/80">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
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
    <Link
      href={href}
      onClick={onClick}
      className={`admin-nav-link flex min-h-11 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-200/70 ${
        isActive
          ? "admin-nav-link-active border-white/20 bg-white/15 text-white"
          : "border-white/10 text-sky-100"
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-sky-100/70">→</span>
    </Link>
  );
});
