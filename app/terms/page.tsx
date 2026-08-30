import Link from "next/link";
import { EditorialPage, EditorialSection } from "@/components/info/EditorialPage";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata({ title: "Terms of Service", description: "Terms governing orders, website use and RUN CLUB submissions at 213 RUN.", pathname: "/terms" });
const sections = [
["ABOUT 213 RUN", "213 RUN is an Algerian streetwear store offering clothing, accessories and curated Looks through this website."],
["ORDERS", "Submitting an order creates a pending order request. We may contact you to confirm delivery information before shipping. We reserve the right to cancel an order when required information is invalid, an item is unavailable, or the order cannot be fulfilled."],
["PRICES & PAYMENT", "Prices are displayed in Algerian dinars (DZD). Payment is currently Cash on Delivery. Product prices and delivery fees shown at checkout are verified when the order is created."],
["PRODUCT AVAILABILITY", "Product availability may change. Adding an item to a cart does not guarantee availability until the order is successfully created."],
["SHIPPING", "Delivery fees depend on the selected Wilaya and delivery mode. Customers are responsible for providing accurate delivery information."],
["RETURNS & EXCHANGES", "Return and exchange requests must follow the Returns & Exchanges policy published on this website. Nothing in these Terms is intended to limit rights available under applicable Algerian law."],
["ACCOUNT & WEBSITE USE", "Customers are responsible for providing accurate information and for keeping access to their account secure. The website must not be used for fraudulent orders, abuse or attempts to interfere with the service."],
["RUN CLUB", "RUN CLUB submissions must belong to the person submitting them or be content they are authorized to share. Content is reviewed before public display. Approval is not guaranteed, and 213 RUN may reject or remove submissions that do not meet the published rules."],
["CHANGES TO THESE TERMS", "We may update these terms when our services or policies change. The latest version will be published on this page."],
] as const;
export default function TermsPage() { return <EditorialPage title="TERMS OF SERVICE" updated="August 29, 2026">{sections.map(([title, copy]) => <EditorialSection title={title} key={title}><p>{copy}</p></EditorialSection>)}<EditorialSection title="CONTACT"><p>Questions about orders or these terms can be sent to <Link href="mailto:213run.collab@gmail.com">213run.collab@gmail.com</Link>.</p></EditorialSection></EditorialPage>; }
