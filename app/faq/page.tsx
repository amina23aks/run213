import { EditorialPage } from "@/components/info/EditorialPage";
import { FaqAccordion } from "@/components/info/FaqAccordion";
import { publicPageMetadata } from "@/lib/seo";
export const metadata = publicPageMetadata({ title: "Frequently Asked Questions", description: "Answers about 213 RUN orders, delivery, payment, returns, Looks and RUN CLUB.", pathname: "/faq" });
export default function FaqPage() { return <EditorialPage title="FREQUENTLY ASKED QUESTIONS"><FaqAccordion /></EditorialPage>; }
