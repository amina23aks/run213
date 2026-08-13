"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/context/cart";
import { useFavorites } from "@/context/favorites";

const navItems = [
  { label: "HOME", href: "/" },
  { label: "SHOP", href: "/shop" },
  { label: "ORDERS", href: "/orders" },
  { label: "RUN CLUB", href: "/run-club" },
];

function IconHeart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.5 8.8c0 5.1-8.5 10-8.5 10s-8.5-4.9-8.5-10A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.5 2.8Z" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h2l2.2 10.5h8.7L19 8H7" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { itemCount, isHydrated } = useCart();
  const { totalFavoriteCount, isHydrated: favoritesHydrated } = useFavorites();

  useEffect(() => {
    startTransition(() => setIsMenuOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  return (
    <>
    <header className="site-header">
      <Link className="site-header__logo" href="/" aria-label="213 RUN home">
        <Image src="/brand/logo-213-light.png" alt="213 RUN" width={96} height={48} priority />
      </Link>
      <nav className="site-header__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link aria-current={pathname === item.href ? "page" : undefined} key={item.label} href={item.href}>{item.label}</Link>
        ))}
      </nav>
      <div className="site-header__icons" aria-label="Header actions">
        <Link className="site-header__favorites" href="/favorites" aria-label="Favorites"><IconHeart />{favoritesHydrated && totalFavoriteCount > 0 ? <span>{totalFavoriteCount}</span> : null}</Link>
        <AccountMenu />
        <button className="site-header__cart" type="button" aria-label="Open cart" onClick={() => setIsCartOpen(true)}><IconCart />{isHydrated && itemCount > 0 ? <span>{itemCount}</span> : null}</button>
        <button
          className="site-header__menu"
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
          ref={menuButtonRef}
        ><IconMenu /></button>
      </div>
    </header>
    {isMenuOpen ? (
      <div className="mobile-nav" id="mobile-navigation">
        <button className="mobile-nav__backdrop" type="button" aria-label="Close navigation menu" onClick={() => setIsMenuOpen(false)} />
        <nav className="mobile-nav__panel" aria-label="Mobile navigation">
          {navItems.map((item) => (
            <Link aria-current={pathname === item.href ? "page" : undefined} key={item.label} href={item.href} onClick={() => setIsMenuOpen(false)}>
              <span>{item.label}</span><span aria-hidden="true">→</span>
            </Link>
          ))}
        </nav>
      </div>
    ) : null}
    <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
