"use client";

import Link from "next/link";
import type { Auth, User } from "firebase/auth";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAuthErrorMessage, extractFirebaseAuthCode, shouldFallbackToRedirect } from "@/lib/auth-errors";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AuthMode = "login" | "signup";
type FormErrors = { email?: string; password?: string };

export function AccountMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<"email" | "google" | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : null);

  const authTitle = useMemo(() => (mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"), [mode]);

  useEffect(() => {
    if (missingClientEnv.length) return;

    let unsubscribe: (() => void) | undefined;

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        setAuth(client.auth);
        authModule.getRedirectResult(client.auth)
          .catch((error: unknown) => setMessage(getAuthErrorMessage(extractFirebaseAuthCode(error))));
        unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => {
          setUser(nextUser);
          setMessage(null);
          setFormErrors({});
          if (nextUser) { setIsAuthOpen(false); window.requestAnimationFrame(() => triggerRef.current?.focus()); }
        });
      })
      .catch(() => setMessage("Firebase Auth could not be initialized."));

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    function openRequestedAuth() { openAuth(); }
    window.addEventListener("run213:open-auth", openRequestedAuth);
    return () => window.removeEventListener("run213:open-auth", openRequestedAuth);
  }, []);

  useEffect(() => {
    if (!isMenuOpen && !isAuthOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setIsMenuOpen(false);
        if (isAuthOpen) {
          setIsAuthOpen(false);
          setFormErrors({});
          setPassword("");
          window.requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, isAuthOpen, isMenuOpen]);

  useEffect(() => {
    if (!isAuthOpen) return;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("button, input")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isAuthOpen]);

  function trapDialogFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function openAuth() {
    setMode("login");
    setIsMenuOpen(false);
    setIsAuthOpen(true);
    setMessage(null);
    setFormErrors({});
  }

  function closeAuth() {
    if (busy) return;
    setIsAuthOpen(false);
    setFormErrors({});
    setPassword("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setFormErrors({});
    setPassword("");
  }

  function validateForm() {
    const nextErrors: FormErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function signInWithGoogle() {
    if (!auth) return;
    setBusy(true);
    setBusyAction("google");
    setMessage(null);
    setFormErrors({});

    try {
      const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/client"),
      ]);
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const code = extractFirebaseAuthCode(error);
      if (code !== "auth/popup-closed-by-user") setMessage(getAuthErrorMessage(code));
      if (shouldFallbackToRedirect(code)) {
        const [{ signInWithRedirect }, { googleProvider }] = await Promise.all([
          import("firebase/auth"),
          import("@/lib/firebase/client"),
        ]);
        await signInWithRedirect(auth, googleProvider);
      }
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !validateForm()) return;

    setBusy(true);
    setBusyAction("email");
    setMessage(null);

    try {
      const authModule = await import("firebase/auth");
      if (mode === "login") {
        await authModule.signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await authModule.createUserWithEmailAndPassword(auth, email.trim(), password);
      }
      setPassword("");
      setFormErrors({});
    } catch (error: unknown) {
      setMessage(getAuthErrorMessage(extractFirebaseAuthCode(error)));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  async function signOutUser() {
    if (!auth) return;
    setBusy(true);
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setIsMenuOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="accountMenu">
      <button
        className="accountMenu__trigger"
        type="button"
        aria-label="Open account menu"
        ref={triggerRef}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <IconUser />
      </button>

      {isMenuOpen ? (
        <div className="accountPopover" role="menu" aria-label="Account menu">
          {user ? (
            <div className="accountPopover__signedIn">
              <span>{user.email ?? "Signed in"}</span>
              <Link href="/account">MY ACCOUNT</Link>
              <Link href="/orders">MY ORDERS</Link>
              <Link href="/favorites">FAVORITES</Link>
              <button type="button" onClick={signOutUser} disabled={busy}>SIGN OUT</button>
            </div>
          ) : (
            <>
              <button className="accountPopover__login" type="button" onClick={openAuth}>SIGN IN</button>
              <Link href="/orders">MY ORDERS</Link>
            </>
          )}
        </div>
      ) : null}

      {isAuthOpen ? (
        <div className="accountAuthModal" role="presentation">
          <button className="accountAuthModal__backdrop" type="button" aria-label="Close login" onClick={closeAuth} />
          <section ref={dialogRef} className="accountAuthModal__card" role="dialog" aria-modal="true" aria-labelledby="account-auth-title" onKeyDown={trapDialogFocus} onClick={(event) => event.stopPropagation()}>
            <button className="accountAuthModal__close" type="button" aria-label="Close login" onClick={closeAuth} disabled={busy}>×</button>
            <p className="accountMenu__eyebrow">RUN213 ACCOUNT</p>
            <h2 id="account-auth-title">{authTitle}</h2>
            <div className="accountTabs" role="tablist" aria-label="Authentication mode">
              <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "isActive" : undefined} disabled={busy} onClick={() => switchMode("login")}>LOGIN</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "isActive" : undefined} disabled={busy} onClick={() => switchMode("signup")}>SIGN UP</button>
            </div>
            <form className="accountMenu__form" onSubmit={submitEmailAuth} noValidate>
              <label>
                <span>Email</span>
                <input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" aria-invalid={Boolean(formErrors.email)} />
                {formErrors.email ? <small>{formErrors.email}</small> : null}
              </label>
              <label>
                <span>Password</span>
                <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={Boolean(formErrors.password)} />
                {formErrors.password ? <small>{formErrors.password}</small> : null}
              </label>
              <button className="accountMenu__primary" type="submit" disabled={!auth || busy || Boolean(missingClientEnv.length)}>{busyAction === "email" ? "PLEASE WAIT…" : mode === "login" ? "SIGN IN →" : "CREATE ACCOUNT →"}</button>
            </form>
            <div className="accountDivider"><span>OR</span></div>
            <button className="accountMenu__secondary accountMenu__google" type="button" onClick={signInWithGoogle} disabled={!auth || busy || Boolean(missingClientEnv.length)} aria-label={mode === "login" ? "Sign in with Google" : "Sign up with Google"}>
              {busyAction === "google" ? <span className="accountMenu__googleSpinner" aria-hidden="true" /> : <GoogleIcon />}
              <span>{mode === "login" ? "Sign in with Google" : "Sign up with Google"}</span>
            </button>
            {message ? <p className="accountMenu__message" role="alert">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function IconUser() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="accountMenu__googleIcon" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
