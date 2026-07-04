import Image from "next/image";
import { BrandPhilosophy } from "@/components/home/BrandPhilosophy";
import { footerColumns } from "@/constants/home";

export function Footer() {
  return (
    <footer className="site-footer">
      <BrandPhilosophy />
      <div className="site-footer__brand">
        <Image src="/brand/logo-213-run-dark.png" alt="213 RUN" width={132} height={48} />
        <p>© 2026 213 RUN. All rights reserved.</p>
      </div>
      <div className="site-footer__columns">
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3>{column.title}</h3>
            {column.links.map((link) => <a href="#home" key={link}>{link}</a>)}
          </nav>
        ))}
        <form className="site-footer__club" action="#">
          <h3>JOIN THE CLUB</h3>
          <p>Get early access to new drops and exclusive offers.</p>
          <label>
            <span>Email address</span>
            <input type="email" placeholder="Enter your email" />
            <button type="submit" aria-label="Join the club">→</button>
          </label>
          <small>Privacy Policy · Terms of Service</small>
        </form>
      </div>
    </footer>
  );
}
