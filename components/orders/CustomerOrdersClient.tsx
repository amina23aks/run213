"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCustomerListHeaders } from "@/components/orders/customerOrderAccess";
import { getGuestOrderAccess, removeGuestOrderAccess } from "@/components/orders/orderAccessStorage";
import { formatDzd, formatOrderDate, orderStatusClass } from "@/components/orders/orderUtils";
import type { CustomerOrder } from "@/components/orders/types";

type LoadState = "hydrating" | "claiming" | "loading" | "loaded" | "empty" | "error";
type ClaimResponse = { claimedOrderIds?: string[]; staleOrderIds?: string[] };

function dedupeOrders(orders: CustomerOrder[]) {
  return [...new Map(orders.map((order) => [order.id, order])).values()];
}

export function CustomerOrdersClient() {
  const router = useRouter();
  const started = useRef(false);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>("hydrating");
  const [message, setMessage] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [claimedCount, setClaimedCount] = useState(0);

  const loadOrders = useCallback(async (next: string | null, mode: "replace" | "append", forceRefresh = false) => {
    setState("loading");
    const access = await getCustomerListHeaders(forceRefresh);
    setAuthed(access.authed);
    const params = new URLSearchParams();
    if (next) params.set("cursor", next);
    const response = await fetch(`/api/customer/orders?${params}`, { headers: access.headers, cache: "no-store" });
    const data = await response.json() as { orders?: CustomerOrder[]; nextCursor?: string | null; message?: string };
    if (!response.ok || !data.orders) throw new Error(data.message ?? "Orders could not be loaded.");
    const nextOrders = dedupeOrders(mode === "append" ? [...orders, ...data.orders] : data.orders);
    setOrders(nextOrders);
    setCursor(data.nextCursor ?? null);
    setState(nextOrders.length ? "loaded" : "empty");
  }, [orders]);

  const initialize = useCallback(async () => {
    setMessage(null);
    try {
      setState("hydrating");
      let access = await getCustomerListHeaders();
      setAuthed(access.authed);
      if (access.authed) {
        const stored = getGuestOrderAccess();
        if (stored.length) {
          setState("claiming");
          const response = await fetch("/api/customer/orders/claim", { method: "POST", headers: { ...access.headers, "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ orders: stored.map(({ orderId, token }) => ({ orderId, token })) }) });
          const data = await response.json().catch(() => ({})) as ClaimResponse;
          if (response.status === 401) access = await getCustomerListHeaders(true);
          else if (response.ok) {
            const claimedIds = Array.isArray(data.claimedOrderIds) ? data.claimedOrderIds : [];
            const staleIds = Array.isArray(data.staleOrderIds) ? data.staleOrderIds : [];
            [...claimedIds, ...staleIds].forEach(removeGuestOrderAccess);
            setClaimedCount(claimedIds.length);
          }
        }
      }
      setState("loading");
      const response = await fetch("/api/customer/orders", { headers: access.headers, cache: "no-store" });
      const data = await response.json() as { orders?: CustomerOrder[]; nextCursor?: string | null; message?: string };
      if (!response.ok || !data.orders) throw new Error(data.message ?? "Orders could not be loaded.");
      const nextOrders = dedupeOrders(data.orders);
      setOrders(nextOrders);
      setCursor(data.nextCursor ?? null);
      setState(nextOrders.length ? "loaded" : "empty");
      router.refresh();
    } catch (error) {
      setOrders([]);
      setCursor(null);
      setState("error");
      setMessage(error instanceof Error ? error.message : "Orders could not be loaded.");
    }
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void initialize();
  }, [initialize]);

  const busy = state === "hydrating" || state === "claiming" || state === "loading";
  return <section className="customerOrders">
    <div className="customerOrders__head"><span className="section-number">ORDERS</span><h1>MY ORDERS</h1><p>Secure order history for your 213 RUN checkout sessions.</p></div>
    {claimedCount > 0 ? <div className="orderClaimNotice" role="status"><div><strong>GUEST ORDERS ADDED TO YOUR ACCOUNT.</strong><span>{claimedCount} guest order{claimedCount === 1 ? "" : "s"} added</span><p>These orders are now saved to this account and are available on your other devices. Sign in again to view them after signing out.</p></div><button type="button" aria-label="Dismiss guest order notification" onClick={() => setClaimedCount(0)}>×</button></div> : null}
    {busy ? <p className="orderNotice orderNotice--info">{state === "hydrating" ? "Checking your account…" : state === "claiming" ? "Adding guest orders to your account…" : "Loading orders…"}</p> : null}
    {state === "error" ? <div className="orderEmpty orderEmpty--error"><strong>Orders could not be loaded.</strong><p>{message}</p><button className="button" onClick={() => void initialize()}>RETRY</button></div> : null}
    {state === "empty" ? <div className="orderEmpty"><strong>NO ORDERS FOUND.</strong><p>{authed ? "Your account orders will appear here." : "Guest orders from this browser appear here. Orders added to an account are available after signing in."}</p><div className="orderEmpty__actions"><Link href="/shop">CONTINUE SHOPPING →</Link>{!authed ? <button type="button" onClick={() => window.dispatchEvent(new Event("run213:open-auth"))}>SIGN IN →</button> : null}</div></div> : null}
    {state === "loaded" ? <div className="orderCards">{orders.map((order) => <article className="orderCard" key={order.id} role="link" tabIndex={0} onClick={() => router.push(`/orders/${order.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); router.push(`/orders/${order.id}`); } }}>{order.thumbnail ? <Image src={order.thumbnail} alt="" width={76} height={76} unoptimized /> : <span className="orderCard__thumb" />}<div><strong>{order.orderNumber}</strong><p>{order.items[0]?.name ?? `${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}</p><small>{formatOrderDate(order.createdAt)}</small></div><span className={orderStatusClass(order.status)}>{order.status}</span><b>{formatDzd(order.totals.totalDzd)}</b><Link href={`/orders/${order.id}`} onClick={(event) => event.stopPropagation()}>VIEW ORDER →</Link></article>)}</div> : null}
    {cursor ? <button className="ordersLoadMore" disabled={busy} onClick={() => void loadOrders(cursor, "append")}>{busy ? "LOADING..." : "LOAD MORE"}</button> : null}
  </section>;
}
