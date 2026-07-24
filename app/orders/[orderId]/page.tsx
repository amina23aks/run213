import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CustomerOrderDetailClient } from "@/components/orders/CustomerOrderDetailClient";

type Props = { params: Promise<{ orderId: string }> };
export default async function OrderDetailPage({ params }: Props) { const { orderId } = await params; return <><Header /><main className="ordersPage"><CustomerOrderDetailClient orderId={orderId} /></main><div className="club-footer-shell"><Footer /></div></>; }
