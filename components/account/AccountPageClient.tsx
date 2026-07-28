"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { ALGERIA_WILAYAS } from "@/data/algeriaWilayas";
import { useFavorites } from "@/context/favorites";
import { loadProfile, saveProfile, type ProfileResponse } from "@/lib/profile/client";
import { EMPTY_CUSTOMER_PROFILE, type CustomerProfile } from "@/types/profile";

export function AccountPageClient() {
  const { totalFavoriteCount } = useFavorites();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [values, setValues] = useState<CustomerProfile>(EMPTY_CUSTOMER_PROFILE);
  const [state, setState] = useState<"loading" | "loaded" | "saving" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    import("@/lib/firebase/client").then(async ({ auth }) => {
      const { onAuthStateChanged } = await import("firebase/auth");
      unsubscribe = onAuthStateChanged(auth, (next) => { setUser(next); setAuthReady(true); });
    });
    return () => unsubscribe?.();
  }, []);
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    setState("loading");
    loadProfile(user).then((next) => { setProfile(next); setValues(next.defaults); setState("loaded"); }).catch((error) => { setMessage(error.message); setState("error"); });
  }, [user]);

  const update = (field: keyof CustomerProfile, value: string) => setValues((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setPhoneError(""); setMessage("");
    const normalizedPhone = values.phone.replace(/[^0-9+]/g, "");
    if (!/^(?:\+213|0)[5-7][0-9]{8}$/.test(normalizedPhone)) { setPhoneError("Enter a valid Algerian phone number."); setState("loaded"); return; }
    setState("saving");
    try { const next = await saveProfile(user, values); setProfile(next); setValues(next.defaults); setState("success"); }
    catch (error) { const text = error instanceof Error ? error.message : "Could not save account details."; if (/phone/i.test(text)) setPhoneError(text); setMessage(text); setState("error"); }
  }
  async function signOut() { const { auth } = await import("@/lib/firebase/client"); const { signOut } = await import("firebase/auth"); await signOut(auth); }

  if (!authReady) return <AccountState label="CHECKING YOUR ACCOUNT…" />;
  if (!user) return <AccountState label="SIGN IN TO VIEW YOUR ACCOUNT." action />;
  if (state === "loading") return <AccountState label="LOADING ACCOUNT DETAILS…" />;

  return <div className="accountPage">
    <header className="accountPage__head"><span>ACCOUNT</span><h1>MY ACCOUNT</h1></header>
    {state === "success" ? <p className="accountFeedback accountFeedback--success" role="status">ACCOUNT DETAILS SAVED.</p> : null}
    {state === "error" ? <p className="accountFeedback accountFeedback--error" role="alert">{message}</p> : null}
    <div className="accountGrid">
      <section className="accountCard accountIdentity">
        {profile?.identity.photoURL ? <Image src={profile.identity.photoURL} alt="" width={64} height={64} referrerPolicy="no-referrer" /> : <span className="accountIdentity__avatar">{(profile?.identity.displayName || profile?.identity.email || "R")[0].toUpperCase()}</span>}
        <div><small>CUSTOMER</small><h2>{profile?.identity.displayName || "RUN213 CUSTOMER"}</h2><p>{profile?.identity.email}</p>{profile?.identity.createdAt ? <p>Member since {new Date(profile.identity.createdAt).toLocaleDateString()}</p> : null}</div>
      </section>
      <section className="accountCard"><h2>ACCOUNT ACTIVITY</h2><nav className="accountActivity"><Link href="/orders"><span>MY ORDERS</span><b>VIEW →</b></Link><Link href="/favorites"><span>FAVORITES</span><b>{totalFavoriteCount} SAVED →</b></Link><Link href="/run-club"><span>RUN CLUB</span><b>EXPLORE →</b></Link></nav><p className="accountMuted">Run Club profile summaries will follow once submissions are reliably linked to your account.</p></section>
      <form className="accountCard accountDefaults" onSubmit={submit} noValidate>
        <div><h2>SAVED DELIVERY DETAILS</h2><p>Used only to prefill future checkouts. Existing orders never change.</p></div>
        <div className="accountFields accountFields--two"><label><span>Full name</span><input value={values.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label><label><span>Phone</span><input type="tel" value={values.phone} onChange={(e) => update("phone", e.target.value)} aria-invalid={Boolean(phoneError)} required />{phoneError ? <small className="accountFieldError">{phoneError}</small> : null}</label></div>
        <div className="accountFields accountFields--two"><label><span>Email (read only)</span><input value={profile?.identity.email ?? ""} readOnly /></label><label><span>Wilaya</span><select value={values.wilaya} onChange={(e) => update("wilaya", e.target.value)}><option value="">Choose wilaya</option>{ALGERIA_WILAYAS.map((w) => <option key={w.code} value={w.name}>{w.label}</option>)}</select></label></div>
        <label><span>Address</span><input value={values.address} onChange={(e) => update("address", e.target.value)} /></label>
        <fieldset><legend>Delivery mode</legend><label><input type="radio" checked={values.deliveryMode === "home"} onChange={() => update("deliveryMode", "home")} /> Home</label><label><input type="radio" checked={values.deliveryMode === "desk"} onChange={() => update("deliveryMode", "desk")} /> Desk</label></fieldset>
        <label><span>Delivery notes optional</span><textarea rows={3} value={values.notes} onChange={(e) => update("notes", e.target.value)} /></label>
        <button className="accountSave" disabled={state === "saving"}>{state === "saving" ? "SAVING…" : "SAVE DETAILS"}</button>
      </form>
      <section className="accountCard accountSignout"><div><h2>SIGN OUT</h2><p>Your guest-order access stays on this device.</p></div><button onClick={signOut}>SIGN OUT</button></section>
    </div>
  </div>;
}

function AccountState({ label, action = false }: { label: string; action?: boolean }) { return <div className="accountPage accountState"><p>{label}</p>{action ? <button onClick={() => window.dispatchEvent(new Event("run213:open-auth"))}>SIGN IN</button> : null}</div>; }
