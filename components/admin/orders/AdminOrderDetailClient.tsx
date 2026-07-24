"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatAdminDate, formatDzdValue, NEXT_STATUS } from "@/components/admin/orders/adminOrderUtils";
import { AdminStatusMenu } from "@/components/admin/orders/AdminStatusMenu";
import type { AdminOrderDetail, AdminOrderStatus } from "@/components/admin/orders/types";

export function AdminOrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const options = useMemo(() => order ? NEXT_STATUS[order.status] : [], [order]);

  async function getToken() { const [{ auth }] = await Promise.all([import("@/lib/firebase/client")]); return auth.currentUser?.getIdToken(); }
  const load = useCallback(async () => { setLoading(true); setMessage(null); try { const token = await getToken(); const response = await fetch(`/api/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json() as { order?: AdminOrderDetail; error?: string }; if (!response.ok || !data.order) throw new Error(data.error ?? "Order could not be loaded."); setOrder(data.order); } catch (error) { setMessage(error instanceof Error ? error.message : "Order could not be loaded."); } finally { setLoading(false); } }, [orderId]);
  async function updateStatus(nextStatus: AdminOrderStatus, note?: string | null) { setSaving(true); setMessage(null); try { const token = await getToken(); const response = await fetch(`/api/admin/orders/${orderId}/status`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, note }) }); const data = await response.json() as { order?: AdminOrderDetail; error?: string }; if (!response.ok || !data.order) throw new Error(data.error ?? "Status could not be updated."); setOrder(data.order); setMessage("Status updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Status could not be updated."); } finally { setSaving(false); } }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  return <AdminShell title={order?.orderNumber ?? "Order"} description="Manage one order with secure server-side status transitions."><AdminAccessGate>
    {loading ? <section className="adminCard"><p className="adminNotice">Loading order…</p></section> : null}
    {message ? <p className={`adminNotice ${message === "Status updated." ? "adminNotice--success" : "adminNotice--error"}`}>{message}</p> : null}
    {order ? <section className="adminOrderDetailWorkspace">
      <header className="adminOrderDetailHeader adminCard"><div><Link href="/admin/orders">← Back to Orders</Link><h2>{order.orderNumber}</h2><span>{formatAdminDate(order.createdAt)}</span></div><AdminStatusMenu status={order.status} disabled={saving} onChange={updateStatus} />{!options.length ? <span className="adminNotice">Terminal status</span> : null}</header>
      <section className="adminOrderCardsGrid">
        <AdminInfoCard title="Order summary" rows={[ ["Items subtotal", formatDzdValue(order.totals.itemsSubtotalDzd)], ["Shipping", formatDzdValue(order.totals.shippingDzd)], ["Total", formatDzdValue(order.totals.totalDzd)], ["Payment method", order.paymentMethod ?? "cash_on_delivery"], ["Payment status", order.paymentStatus ?? "Unknown"], ["Cost of goods", formatDzdValue(order.totals.costOfGoodsDzd)], ["Estimated profit", formatDzdValue(order.totals.estimatedProfitDzd)] ]} />
        <AdminInfoCard title="Customer information" rows={[ ["Full name", order.customer.fullName ?? "Missing"], ["Phone", order.customer.phone ?? "Missing"], ["Email", order.customer.email ?? "Not provided"] ]} />
        <AdminInfoCard title="Delivery information" rows={[ ["Wilaya", order.delivery.wilaya ?? "Missing"], ["Commune", order.delivery.commune ?? "Not provided"], ["Address", order.delivery.address ?? "Missing"], ["Mode", order.delivery.deliveryMode ?? "Missing"], ["Notes", order.delivery.notes ?? "No notes"] ]} />
      </section>
      <section className="adminOrderItems adminCard"><div className="adminCard__heading"><p>ITEMS</p><h2>Order items</h2></div>{order.items.map((item, index) => <article className="adminOrderItem" key={`${item.productId ?? index}-${index}`}>{item.image ? <Image src={item.image} alt={item.name} width={72} height={72} unoptimized /> : <span className="adminOrderItem__imageFallback">No image</span>}<div><strong>{item.name}</strong><small><span>SIZE {item.selectedSize ?? "—"}</span>{item.selectedColor ? <i className="inlineSwatch" style={{ background: colorValue(item.selectedColor) }} aria-label={`Color ${item.selectedColor}`} /> : null}<span>Qty {item.quantity}</span></small>{item.lookName ? <small>Look: {item.lookName} · {item.lookPricingMode ?? "look"}</small> : null}</div><dl><div><dt>Unit</dt><dd>{formatDzdValue(item.unitPriceDzd)}</dd></div><div><dt>Total</dt><dd>{formatDzdValue(item.lineTotalDzd)}</dd></div><div><dt>Unit cost</dt><dd>{item.unitCostDzd == null ? "Cost unavailable" : formatDzdValue(item.unitCostDzd)}</dd></div><div><dt>Line cost</dt><dd>{item.lineCostDzd == null ? "Cost unavailable" : formatDzdValue(item.lineCostDzd)}</dd></div><div><dt>Profit</dt><dd>{item.estimatedLineProfitDzd == null ? "Cost unavailable" : formatDzdValue(item.estimatedLineProfitDzd)}</dd></div></dl></article>)}</section>
      <section className="adminOrderHistory adminCard"><div className="adminCard__heading"><p>ORDER PROGRESS</p></div>{order.statusHistory.map((entry, index) => <article key={`${entry.status}-${entry.at ?? index}`}><strong>{entry.status.toUpperCase()}</strong><span>{formatAdminDate(entry.at)}{entry.actor ? ` · ${entry.actor}` : ""}</span>{entry.note ? <p>{entry.note}</p> : null}</article>)}</section>
    </section> : null}
  </AdminAccessGate></AdminShell>;
}

function AdminInfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) { return <section className="adminOrderInfoCard adminCard"><h3>{title}</h3>{rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</section>; }

function colorValue(value: string) { const key = value.toLowerCase(); if (key.includes("black")) return "#050505"; if (key.includes("white")) return "#f7f2e8"; if (key.includes("lime")) return "#c8ff00"; if (key.includes("gray") || key.includes("grey")) return "#8a8a84"; return value; }
