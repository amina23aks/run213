"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readAnalyticsConsent, writeAnalyticsConsent, type AnalyticsConsent } from "@/lib/analytics";

export function AnalyticsConsentBanner() {
  const [preference, setPreference] = useState<AnalyticsConsent>("denied");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => { const value = readAnalyticsConsent(); setPreference(value); setOpen(true); };
    const timer = window.setTimeout(() => { const value = readAnalyticsConsent(); setPreference(value); setOpen(value === "unknown"); }, 0);
    window.addEventListener("run213:open-cookie-settings", show);
    return () => { window.clearTimeout(timer); window.removeEventListener("run213:open-cookie-settings", show); };
  }, []);
  function decide(value: "allowed" | "denied") { writeAnalyticsConsent(value); setPreference(value); setOpen(false); }
  if (!open) return null;
  return <section className="privacyConsent" role="dialog" aria-modal="false" aria-labelledby="privacy-consent-title">
    <div><span>OPTIONAL ANALYTICS</span><h2 id="privacy-consent-title">YOUR PRIVACY</h2></div>
    <p>We use optional analytics to understand how the site is used and improve the shopping experience. Essential site features continue to work without analytics. <Link href="/privacy">Privacy Policy</Link></p>
    <div className="privacyConsent__actions"><button type="button" onClick={() => decide("allowed")}>ALLOW ANALYTICS</button><button type="button" onClick={() => decide("denied")}>NO THANKS</button></div>
    {preference !== "unknown" ? <small>Current choice: {preference === "allowed" ? "analytics allowed" : "analytics declined"}.</small> : null}
  </section>;
}

export function CookieSettingsButton() { return <button className="footerCookieButton" type="button" onClick={() => window.dispatchEvent(new Event("run213:open-cookie-settings"))}>Cookie Settings</button>; }
