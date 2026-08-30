"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics";

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const [consent, setConsent] = useState<AnalyticsConsent>("unknown");
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => setConsent(readAnalyticsConsent());
    const timer = window.setTimeout(sync, 0);
    window.addEventListener("run213:analytics-consent", sync);
    return () => { window.clearTimeout(timer); window.removeEventListener("run213:analytics-consent", sync); };
  }, []);

  useEffect(() => {
    if (!measurementId) return;
    window[`ga-disable-${measurementId}`] = consent !== "allowed";
    if (consent === "denied") window.dataLayer = [];
  }, [consent, measurementId]);

  useEffect(() => {
    if (consent !== "allowed" || !measurementId || !window.gtag) return;
    const query = searchParams.toString();
    const pagePath = `${pathname}${query ? `?${query}` : ""}`;
    if (lastPage.current === pagePath) return;
    lastPage.current = pagePath;
    window.gtag("event", "page_view", { page_path: pagePath, page_location: window.location.href, page_title: document.title });
  }, [consent, measurementId, pathname, searchParams]);

  if (consent !== "allowed" || !measurementId) return null;
  return <>
    <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
    <Script id="run213-ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false,allow_google_signals:false});`}</Script>
  </>;
}
