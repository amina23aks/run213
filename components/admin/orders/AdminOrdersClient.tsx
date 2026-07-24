"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatAdminDate, formatDzdValue, STATUS_OPTIONS } from "@/components/admin/orders/adminOrderUtils";
import { AdminStatusMenu } from "@/components/admin/orders/AdminStatusMenu";
import type { AdminOrderStatus } from "@/components/admin/orders/types";
import type { AdminOrderSummary } from "@/components/admin/orders/types";

type ListResponse = { orders: AdminOrderSummary[]; nextCursor: string | null };

export function AdminOrdersClient() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function getToken() { const [{ auth }] = await Promise.all([import("@/lib/firebase/client")]); return auth.currentUser?.getIdToken(); }
  const load = useCallback(async (nextCursor: string | null, mode: "replace" | "append") => {
    setLoading(true); setMessage(null);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ limit: "15", status });
      if (search.trim()) params.set("search", search.trim());
      if (nextCursor) params.set("cursor", nextCursor);
      const response = await fetch(`/api/admin/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json() as ListResponse | { error?: string };
      if (!response.ok || !("orders" in data)) throw new Error("error" in data ? data.error : "Orders could not be loaded.");
      setOrders((current) => mode === "append" ? [...current, ...data.orders] : data.orders);
      setCursor(data.nextCursor);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Orders could not be loaded."); }
    finally { setLoading(false); }
  }, [search, status]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(null, "replace"); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function updateOrderStatus(orderId: string, next: AdminOrderStatus, note?: string | null) { setUpdatingId(orderId); setMessage(null); try { const token = await getToken(); const response = await fetch(`/api/admin/orders/${orderId}/status`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: next, note }) }); const data = await response.json() as { order?: AdminOrderSummary; error?: string }; if (!response.ok || !data.order) throw new Error(data.error ?? "Status could not be updated."); setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: data.order!.status } : order)); setMessage("Status updated."); } catch (error) { setMessage(error instanceof Error ? error.message : "Status could not be updated."); } finally { setUpdatingId(null); } }

  return <AdminShell title="Orders" description="Review real pending COD orders, customer details, totals, and fulfillment status."><AdminAccessGate>
    <section className="adminOrdersWorkspace">
      <form className="adminOrdersToolbar adminCard" onSubmit={(event) => { event.preventDefault(); void load(null, "replace"); }}>
        <label><span>Search orders</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order number, customer, phone, email" /></label>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <button className="adminPrimary" type="submit">Search</button>
      </form>
      {message ? <p className="adminNotice adminNotice--error">{message}</p> : null}
      <section className="adminOrderTable adminCard" aria-label="Admin orders list">
        <div className="adminOrderTable__head"><span>Order</span><span>Customer</span><span>Details</span><span>Total</span><span>Status</span><span>Open</span></div>
        {orders.map((order) => <Link className="adminOrderRow" href={`/admin/orders/${order.id}`} key={order.id}>
          <strong>{order.orderNumber}<small>{formatAdminDate(order.createdAt)}</small></strong>
          <span>{order.customer.fullName ?? "No name"}<small>{order.customer.phone ?? "No phone"}{order.customer.email ? ` · ${order.customer.email}` : ""}</small></span>
          <span>{order.wilaya ?? "No wilaya"}<small>{order.itemCount} item{order.itemCount === 1 ? "" : "s"}</small></span>
          <b>{formatDzdValue(order.totalDzd)}</b><AdminStatusMenu status={order.status} disabled={updatingId === order.id} onChange={(next, note) => updateOrderStatus(order.id, next, note)} /><i>→</i>
        </Link>)}
        {!orders.length && !loading ? <p className="adminNotice">No orders found.</p> : null}
      </section>
      {cursor ? <button className="adminProductList__more" type="button" disabled={loading} onClick={() => void load(cursor, "append")}>{loading ? "Loading..." : "Load more"}</button> : null}
    </section>
  </AdminAccessGate></AdminShell>;
}
