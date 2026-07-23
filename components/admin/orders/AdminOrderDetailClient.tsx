"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatAdminDate, formatDzdValue, NEXT_STATUS, statusClass } from "@/components/admin/orders/adminOrderUtils";
import type { AdminOrderDetail, AdminOrderStatus } from "@/components/admin/orders/types";

export function AdminOrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextStatus, setNextStatus] = useState<AdminOrderStatus | "">("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const options = useMemo(() => order ? NEXT_STATUS[order.status] : [], [order]);

  async function getToken() { const [{ auth }] = await Promise.all([import("@/lib/firebase/client")]); return auth.currentUser?.getIdToken(); }
  const load = useCallback(async () => { setLoading(true); setMessage(null); try { const token = await getToken(); const response = await fetch(`/api/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json() as { order?: AdminOrderDetail; error?: string }; if (!response.ok || !data.order) throw new Error(data.error ?? "Order could not be loaded."); setOrder(data.order); setNextStatus(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Order could not be loaded."); } finally { setLoading(false); } }, [orderId]);
  async function updateStatus() { if (!nextStatus) return; setSaving(true); setMessage(null); try { const token = await getToken(); const response = await fetch(`/api/admin/orders/${orderId}/status`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus, note }) }); const data = await response.json() as { order?: AdminOrderDetail; error?: string }; if (!response.ok || !data.order) throw new Error(data.error ?? "Status could not be updated."); setOrder(data.order); setNextStatus(""); setNote(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Status could not be updated."); } finally { setSaving(false); } }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  return <AdminShell title={order?.orderNumber ?? "Order"} description="Manage one order with secure server-side status transitions."><AdminAccessGate>
    {loading ? <section className="adminCard"><p className="adminNotice">Loading order…</p></section> : null}
    {message ? <p className="adminNotice adminNotice--error">{message}</p> : null}
    {order ? <section className="adminOrderDetailWorkspace">
      <header className="adminOrderDetailHeader adminCard"><div><Link href="/admin/orders">← Back to Orders</Link><h2>{order.orderNumber}</h2><span>{formatAdminDate(order.createdAt)}</span></div><em className={statusClass(order.status)}>{order.status}</em>{options.length ? <div className="adminOrderStatusControl"><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as AdminOrderStatus)}><option value="">Update status</option>{options.map((status) => <option value={status} key={status}>{status}</option>)}</select><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Internal status note" /><button className="adminPrimary" disabled={saving || !nextStatus} onClick={() => void updateStatus()} type="button">{saving ? "Saving..." : "Save status"}</button></div> : <span className="adminNotice">Terminal status</span>}</header>
      <section className="adminOrderCardsGrid">
        <AdminInfoCard title="Order summary" rows={[ ["Items subtotal", formatDzdValue(order.totals.itemsSubtotalDzd)], ["Shipping", formatDzdValue(order.totals.shippingDzd)], ["Total", formatDzdValue(order.totals.totalDzd)], ["Payment method", order.paymentMethod ?? "cash_on_delivery"], ["Payment status", order.paymentStatus ?? "Unknown"], ["Cost of goods", formatDzdValue(order.totals.costOfGoodsDzd)], ["Estimated profit", formatDzdValue(order.totals.estimatedProfitDzd)] ]} />
        <AdminInfoCard title="Customer information" rows={[ ["Full name", order.customer.fullName ?? "Missing"], ["Phone", order.customer.phone ?? "Missing"], ["Email", order.customer.email ?? "Not provided"] ]} />
        <AdminInfoCard title="Delivery information" rows={[ ["Wilaya", order.delivery.wilaya ?? "Missing"], ["Commune", order.delivery.commune ?? "Not provided"], ["Address", order.delivery.address ?? "Missing"], ["Mode", order.delivery.deliveryMode ?? "Missing"], ["Notes", order.delivery.notes ?? "No notes"] ]} />
      </section>
      <section className="adminOrderItems adminCard"><div className="adminCard__heading"><p>ITEMS</p><h2>Order items</h2></div>{order.items.map((item, index) => <article className="adminOrderItem" key={`${item.productId ?? index}-${index}`}>{item.image ? <Image src={item.image} alt={item.name} width={72} height={72} unoptimized /> : <span className="adminOrderItem__imageFallback">No image</span>}<div><strong>{item.name}</strong><small>{item.selectedColor ?? "No color"} · {item.selectedSize ?? "No size"} · Qty {item.quantity}</small>{item.lookName ? <small>Look: {item.lookName} · {item.lookPricingMode ?? "look"}</small> : null}</div><dl><div><dt>Unit</dt><dd>{formatDzdValue(item.unitPriceDzd)}</dd></div><div><dt>Total</dt><dd>{formatDzdValue(item.lineTotalDzd)}</dd></div><div><dt>Unit cost</dt><dd>{formatDzdValue(item.unitCostDzd)}</dd></div><div><dt>Line cost</dt><dd>{formatDzdValue(item.lineCostDzd)}</dd></div><div><dt>Profit</dt><dd>{formatDzdValue(item.estimatedLineProfitDzd)}</dd></div></dl></article>)}</section>
      <section className="adminOrderHistory adminCard"><div className="adminCard__heading"><p>STATUS HISTORY</p><h2>Timeline</h2></div>{order.statusHistory.map((entry, index) => <article key={`${entry.status}-${entry.at ?? index}`}><strong>{entry.previousStatus ? `${entry.previousStatus} → ${entry.status}` : entry.status}</strong><span>{formatAdminDate(entry.at)} · {entry.adminEmail ?? entry.actor}</span>{entry.note ? <p>{entry.note}</p> : null}</article>)}</section>
    </section> : null}
  </AdminAccessGate></AdminShell>;
}

function AdminInfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) { return <section className="adminOrderInfoCard adminCard"><h3>{title}</h3>{rows.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value}</strong></p>)}</section>; }
