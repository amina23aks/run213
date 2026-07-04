import Image from "next/image";

const navItems = [
  { label: "SHOP", href: "#shop" },
  { label: "DROP_001", href: "#drop-001" },
  { label: "RUN CLUB", href: "#run-club" },
  { label: "ABOUT", href: "#about" },
];

function IconSearch() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

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
  return (
    <header className="site-header">
      <a className="site-header__logo" href="#home" aria-label="213 RUN home">
        <Image src="/brand/logo-213-light.png" alt="213 RUN" width={96} height={48} priority />
      </a>
      <nav className="site-header__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item.label} href={item.href}>{item.label}</a>
        ))}
      </nav>
      <div className="site-header__icons" aria-label="Header actions">
        <button type="button" aria-label="Search"><IconSearch /></button>
        <button type="button" aria-label="Favorites"><IconHeart /></button>
        <button className="site-header__cart" type="button" aria-label="Cart placeholder"><IconCart /><span>0</span></button>
        <button type="button" aria-label="Menu"><IconMenu /></button>
      </div>
    </header>
  );
}
