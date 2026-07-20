"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";

import { useAuth } from "@/context/auth";
import { useAuthModal } from "@/context/auth-modal";
import { useCart } from "@/context/cart";
import { AnimatePresence, motion } from "@/lib/motion";
import { useFavorites } from "@/hooks/use-favorites";
import { getDb } from "@/lib/firebaseClient";

import ModelViewerLogo from "./ModelViewerLogo";
import LocaleSwitcher from "./LocaleSwitcher";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";
import { localizePathname } from "@/i18n/paths";

const CartDrawer = dynamic(() => import("./cart/cart-drawer"), {
  ssr: false,
});

const links = [
  { href: "/", labelKey: "nav.home" },
  { href: "/shop", labelKey: "nav.shop" },
  { href: "/contact", labelKey: "nav.contact" },
  { href: "/orders", labelKey: "nav.orders" },
];

const iconStyles = "h-5 w-5";

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={iconStyles}
      aria-hidden
    >
      <path d="M4 5h18l-1.8 8.1a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-2-1.6L4 3H1" />
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={iconStyles}
      aria-hidden
    >
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={iconStyles}
      aria-hidden
    >
      <path d="M12 20s-6-3.4-8.7-7.1C1 9.2 2.7 4.2 6.9 3.6 8.8 3.4 10 4.4 12 6c2-1.6 3.2-2.6 5.1-2.4 4.2.5 5.9 5.6 3.6 9.3C18 16.6 12 20 12 20z" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const { user, loading: authLoading, signOut } = useAuth();
  const { openModal } = useAuthModal();
  const { totalQuantity, lastAddedAt } = useCart();
  const { items: favoriteItems } = useFavorites();
  const isFavoritesActive = pathname?.startsWith(localizePathname(locale, "/favorites"));
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasCartDrawerLoaded, setHasCartDrawerLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [loyaltyRewardAvailable, setLoyaltyRewardAvailable] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lastAddedAt) return;
    setIsBumping(true);
    const timer = window.setTimeout(() => setIsBumping(false), 450);
    return () => window.clearTimeout(timer);
  }, [lastAddedAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "aurora");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsAccountMenuOpen(false);
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setLoyaltyRewardAvailable(false);
      return;
    }
    const db = getDb();
    if (!db) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const data = snapshot.data();
        setLoyaltyRewardAvailable(Boolean(data?.loyaltyRewardAvailable));
      },
      (error) => {
        console.error("[navbar] user doc snapshot error", error);
      }
    );
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isAccountMenuOpen &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  const closeAllMenus = useCallback(() => {
    setIsMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, []);

  const toggleDrawer = useCallback(() => {
    startTransition(() => setHasCartDrawerLoaded(true));
    setIsDrawerOpen((previous) => !previous);
  }, []);
  const toggleMenu = useCallback(() => setIsMenuOpen((previous) => !previous), []);
  const toggleAccountMenu = useCallback(() => {
    if (authLoading) return;
    setIsAccountMenuOpen((previous) => !previous);
  }, [authLoading]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setIsAccountMenuOpen(false);
    }
  }, [signOut]);

  const handleOpenAuthModal = useCallback(() => {
    openModal({ returnTo: pathname || localizePathname(locale, "/") });
  }, [locale, openModal, pathname]);

  const handleThemeChange = useCallback((nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
  }, []);

  const localizedLinks = useMemo(() => links.map((link) => ({
    ...link,
    href: localizePathname(locale, link.href),
  })), [locale]);

  return (
    <header
      className={`navbar-shell fixed left-0 right-0 top-0 z-50 w-full border-b border-white/10 shadow-[0_8px_18px_rgba(0,0,0,0.24)] ${
        theme === "dark" ? "bg-[#0f5f8d]/92" : "bg-[#78b7ee]/75"
      }`}
    >
      {/* Navbar height + mobile layout adjustments */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 text-white">
        <Link href={localizePathname(locale, "/")} className="group flex items-center gap-3">
          <ModelViewerLogo />
          <div className="leading-tight">
            <p className="text-base font-semibold text-white">Fish Your Style</p>
            <span className="text-xs text-sky-100">
              Streetwear for every moood
            </span>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-2 text-sm font-medium text-sky-100 md:flex">
          {localizedLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeAllMenus}
                className={`rounded-full px-4 py-2 transition-colors duration-200 ${
                  active
                    ? "bg-white/20 text-white shadow-inner shadow-white/10"
                    : "hover:bg-white/10 hover:text-white"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Mobile icon ordering tweak: cart → account → menu (aligned together) */}
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <Link
            href={localizePathname(locale, "/favorites")}
            className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl border text-white shadow-sm shadow-black/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              isFavoritesActive
                ? "border-rose-200/70 bg-rose-400/30"
                : "border-white/25 bg-white/10 hover:-translate-y-0.5 hover:bg-white/15"
            }`}
            aria-label="Wishlist"
          >
            <HeartIcon />
            {favoriteItems.length > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-rose-400 px-2 py-0.5 text-center text-[10px] font-semibold text-slate-900 shadow-md shadow-black/25">
                {favoriteItems.length}
              </span>
            )}
            <span className="sr-only">Wishlist</span>
          </Link>
          <motion.button
            type="button"
            onClick={toggleDrawer}
            animate={{
              scale: isBumping ? 1.08 : 1,
              rotate: isBumping ? "-2deg" : "0deg",
            }}
            whileTap={{ scale: 0.95 }}
            data-cart-target="true"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Cart"
          >
            <CartIcon />
            {totalQuantity > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[22px] rounded-full bg-white px-2 py-0.5 text-center text-[11px] font-semibold text-slate-900 shadow-md shadow-black/25">
                {totalQuantity}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </motion.button>
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={toggleAccountMenu}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-sm font-semibold text-white shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Account"
              disabled={authLoading}
            >
              <AccountIcon />
              {user && loyaltyRewardAvailable ? (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-rose-200/70 bg-rose-400/90 shadow-[0_0_8px_rgba(251,113,133,0.6)]"
                  aria-hidden
                />
              ) : null}
              <span className="sr-only">Account</span>
            </button>
            <AnimatePresence>
              {isAccountMenuOpen && !authLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/95 text-sm text-sky-50 shadow-lg shadow-black/20"
                  role="menu"
                >
                  <div className="flex flex-col gap-3 p-3">
                    {user ? (
                      <>
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-sky-100">
                          <span className="font-semibold">
                            {user.email ?? t("profile.myProfile")}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={localizePathname(locale, "/account")}
                            className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                            role="menuitem"
                            onClick={() => setIsAccountMenuOpen(false)}
                          >
                            <span className="flex items-center gap-2">
                              {t("profile.myProfile")}
                              {loyaltyRewardAvailable ? (
                                <span
                                  className="h-2 w-2 rounded-full border border-rose-200/70 bg-rose-400/90 shadow-[0_0_8px_rgba(251,113,133,0.6)]"
                                  aria-hidden
                                />
                              ) : null}
                            </span>
                          </Link>
                          <Link
                            href={localizePathname(locale, "/orders")}
                            className="flex items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10"
                            role="menuitem"
                            onClick={() => setIsAccountMenuOpen(false)}
                          >
                            {t("profile.myOrders")}
                          </Link>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          handleOpenAuthModal();
                        }}
                        className="flex items-center justify-center rounded-xl bg-sky-400 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-sky-500/30 transition hover:bg-sky-300"
                      >
                        {t("profile.signIn")}
                      </button>
                    )}

                    <div className="h-px bg-white/10" aria-hidden />
                    <div className="space-y-2">
                      <p className="px-2 text-[11px] uppercase tracking-[0.3em] text-sky-200/70">
                        {t("profile.preferences")}
                      </p>
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-xs font-semibold text-sky-100">
                          {t("profile.theme")}
                        </span>
                        <div className="flex items-center gap-1 rounded-full bg-slate-900/40 p-1 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => handleThemeChange("light")}
                            className={`rounded-full px-2.5 py-1 transition ${
                              theme === "light"
                                ? "bg-white text-slate-900"
                                : "text-sky-100/80 hover:text-white"
                            }`}
                            aria-pressed={theme === "light"}
                          >
                            {t("profile.light")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThemeChange("dark")}
                            className={`rounded-full px-2.5 py-1 transition ${
                              theme === "dark"
                                ? "bg-white text-slate-900"
                                : "text-sky-100/80 hover:text-white"
                            }`}
                            aria-pressed={theme === "dark"}
                          >
                            {t("profile.dark")}
                          </button>
                        </div>
                      </div>
                      <LocaleSwitcher />
                    </div>

                    {user ? (
                      <>
                        <div className="h-px bg-white/10" aria-hidden />
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                          role="menuitem"
                        >
                          {t("profile.signOut")}
                        </button>
                      </>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={toggleMenu}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-4 text-sm font-medium text-white md:hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-md shadow-black/20">
              {localizedLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeAllMenus}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 transition ${
                      active
                        ? "bg-white/15 text-white"
                        : "text-sky-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t(link.labelKey)}
                    {active && <span className="text-xs text-sky-200">●</span>}
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {hasCartDrawerLoaded ? <CartDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} /> : null}
    </header>
  );
}

export default Navbar;
