import Image from "next/image";

const navItems = ["Shop", "Drop_001", "213 Run Club", "About"];

export function Header() {
  return (
    <header className="site-header">
      <a className="site-header__logo" href="#home" aria-label="213 RUN home">
        <Image
          src="/brand/logo-213-run-dark.png"
          alt="213 RUN"
          width={132}
          height={48}
          priority
        />
      </a>
      <nav className="site-header__nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-").replace("_", "-")}`}>
            {item}
          </a>
        ))}
      </nav>
      <div className="site-header__actions">
        <span className="site-header__cart" aria-label="Cart placeholder">Cart 0</span>
        <button className="site-header__menu" type="button" aria-label="Menu placeholder">
          Menu
        </button>
      </div>
    </header>
  );
}
