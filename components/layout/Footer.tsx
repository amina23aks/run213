import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const footerColumns = [
  {
    title: "SHOP",
    links: ["All Products", "T-Shirts", "Shorts", "Pants", "Hoodies", "Accessories"],
  },
  {
    title: "DROP_001",
    links: ["Overview", "Tops", "Bottoms", "Accessories"],
  },
  {
    title: "INFO",
    links: ["Run Club", "About Us", "Shipping", "Returns", "FAQ"],
  },
  {
    title: "FOLLOW US",
    links: ["Instagram", "TikTok", "YouTube", "Strava"],
  },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="footer-brand">
          <Image className="logo-dark" src="/brand/logo-213-run-dark.png" alt="213 RUN" width={180} height={52} />
          <Image className="logo-light" src="/brand/logo-213-run-light.png" alt="" width={180} height={52} aria-hidden="true" />
          <p>BUILT. NOT FOUND.</p>
        </div>

        <div className="footer-columns">
          {footerColumns.map((column) => (
            <div key={column.title} className="footer-column">
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-newsletter">
          <h2>JOIN THE CLUB</h2>
          <p>Get early access to new drops and exclusive offers.</p>
          <label className="sr-only" htmlFor="footer-email">
            Email address
          </label>
          <div className="newsletter-control">
            <input id="footer-email" type="email" placeholder="Enter your email" />
            <button type="button" aria-label="Join the club">
              <ArrowUpRight aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
