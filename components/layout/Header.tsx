import { Heart, Menu, Search, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";

const navItems = [
  { href: "/shop", label: "SHOP" },
  { href: "/#drop-001", label: "DROP_001" },
  { href: "/run-club", label: "RUN CLUB" },
  { href: "/about", label: "ABOUT" },
];

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="site-logo" aria-label="213 RUN home">
          <Image
            className="logo-dark"
            src="/brand/logo-213-run-dark.png"
            alt="213 RUN"
            width={168}
            height={48}
            priority
          />
          <Image
            className="logo-light"
            src="/brand/logo-213-run-light.png"
            alt=""
            width={168}
            height={48}
            priority
            aria-hidden="true"
          />
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-actions" aria-label="Header actions">
          <IconButton label="Search">
            <Search aria-hidden="true" size={20} />
          </IconButton>
          <IconButton label="Favorites">
            <Heart aria-hidden="true" size={20} />
          </IconButton>
          <IconButton label="Cart" badge="0">
            <ShoppingBag aria-hidden="true" size={20} />
          </IconButton>
          <IconButton label="Open menu" className="site-menu-button">
            <Menu aria-hidden="true" size={22} />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
