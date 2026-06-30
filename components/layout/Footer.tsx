import Image from "next/image";

const footerLinks = ["Shop", "About", "Contact", "Instagram", "TikTok", "Privacy", "Terms"];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <Image src="/brand/logo-213-run-light.png" alt="213 RUN" width={126} height={48} />
        <p>BUILT. NOT FOUND.</p>
      </div>
      <nav className="site-footer__links" aria-label="Footer navigation">
        {footerLinks.map((link) => (
          <a key={link} href="#home">{link}</a>
        ))}
      </nav>
      <p className="site-footer__fine">© 2026 213 RUN. Every step builds you.</p>
    </footer>
  );
}
