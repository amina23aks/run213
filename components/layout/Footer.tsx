import Image from "next/image";
import { BrandPhilosophy } from "@/components/home/BrandPhilosophy";
import { footerColumns } from "@/constants/home";
import { FooterClubForm } from "@/components/layout/FooterClubForm";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__identity">
        <BrandPhilosophy />
        <div className="site-footer__brand-lockup">
          <Image src="/brand/logo-213-light.png" alt="213 RUN" width={104} height={52} />
          <p>BUILT.<br />NOT FOUND.</p>
        </div>
      </div>
      <div className="site-footer__columns">
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3>{column.title}</h3>
            {column.links.map((link) => <a href="#home" key={link}>{link}</a>)}
          </nav>
        ))}
        <FooterClubForm />
      </div>
      <div className="site-footer__legal"><div><a href="/privacy">Privacy Policy</a><span aria-hidden="true">·</span><a href="/terms">Terms of Service</a></div><small>© 2026 213 RUN. All rights reserved.</small></div>
    </footer>
  );
}
