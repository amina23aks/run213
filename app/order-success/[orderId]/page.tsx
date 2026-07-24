import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { OrderSuccessLookup } from "@/components/orders/OrderSuccessLookup";

type Props = { params: Promise<{ orderId: string }> };
export default async function OrderSuccessPage({ params }: Props) { const { orderId } = await params; return <><Header/><main className="checkoutPage checkoutPage--success"><section className="checkoutSuccessCard"><span>ORDER CREATED</span><OrderSuccessLookup orderId={orderId}/><em className="customerStatus customerStatus--pending">Pending</em><p><strong>Cash on delivery</strong></p><p>Your order was created. We’ll confirm delivery details before shipping.</p><div><Link className="button button--lime" href={`/orders/${orderId}`}>VIEW ORDER →</Link><Link className="button button--ghost" href="/shop">CONTINUE SHOPPING →</Link></div></section></main><div className="club-footer-shell"><Footer/></div></>; }
