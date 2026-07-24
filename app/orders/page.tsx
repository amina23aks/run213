export const dynamic = "force-dynamic";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CustomerOrdersClient } from "@/components/orders/CustomerOrdersClient";

export default function OrdersPage() { return <><Header /><main className="ordersPage"><CustomerOrdersClient /></main><div className="club-footer-shell"><Footer /></div></>; }
