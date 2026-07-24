"use client";
import { useEffect, useState } from "react";
import { getGuestOrderAccess } from "@/components/orders/orderAccessStorage";
export function OrderSuccessLookup({ orderId }: { orderId: string }) { const [number, setNumber] = useState(orderId); useEffect(() => { const timer = window.setTimeout(() => setNumber(getGuestOrderAccess().find((entry) => entry.orderId === orderId)?.orderNumber ?? orderId), 0); return () => window.clearTimeout(timer); }, [orderId]); return <h1 title={number}>{number}</h1>; }
