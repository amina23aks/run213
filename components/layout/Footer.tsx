import Image from "next/image";
import { BrandPhilosophy } from "@/components/home/BrandPhilosophy";
import { footerColumns } from "@/constants/home";
import { FooterClubForm } from "@/components/layout/FooterClubForm";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/analytics/AnalyticsConsent";

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
            {column.links.map((link) => link.external
              ? <a href={link.href} target="_blank" rel="noopener noreferrer" key={link.label}>{link.label}</a>
              : <Link href={link.href} key={link.label}>{link.label}</Link>)}
          </nav>
        ))}
        <FooterClubForm />
      </div>
      <div className="site-footer__legal"><div><Link href="/privacy">Privacy Policy</Link><span aria-hidden="true">·</span><Link href="/terms">Terms of Service</Link><span aria-hidden="true">·</span><CookieSettingsButton /></div><small>© 2026 213 RUN. All rights reserved.</small></div>
    </footer>
  );
}
