"use client";

import Link from "next/link";
import type { Auth, User } from "firebase/auth";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : null);

  const authTitle = useMemo(() => (mode === "login" ? "Welcome back" : "Create account"), [mode]);

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
          if (nextUser) setIsAuthOpen(false);
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
        setIsAuthOpen(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, isAuthOpen, isMenuOpen]);

  function openAuth() {
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
    }
  }

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !validateForm()) return;

    setBusy(true);
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
              <Link href="/orders">My Orders</Link>
              <Link href="/favorites">Favorites</Link>
              <button type="button" onClick={signOutUser} disabled={busy}>Sign out</button>
            </div>
          ) : (
            <>
              <Link href="/orders">My Orders</Link>
              <Link href="/favorites">Favorites</Link>
              <button className="accountPopover__login" type="button" onClick={openAuth}>Sign in / Sign up</button>
            </>
          )}
        </div>
      ) : null}

      {isAuthOpen ? (
        <div className="accountAuthModal" role="dialog" aria-modal="true" aria-label="Login or sign up">
          <button className="accountAuthModal__backdrop" type="button" aria-label="Close login" onClick={closeAuth} />
          <section className="accountAuthModal__card">
            <button className="accountAuthModal__close" type="button" aria-label="Close login" onClick={closeAuth} disabled={busy}>×</button>
            <p className="accountMenu__eyebrow">ACCOUNT</p>
            <h2>{authTitle}</h2>
            <div className="accountTabs" role="tablist" aria-label="Auth mode">
              <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "isActive" : undefined} onClick={() => switchMode("login")}>Login</button>
              <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "isActive" : undefined} onClick={() => switchMode("signup")}>Sign up</button>
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
              <button className="accountMenu__primary" type="submit" disabled={!auth || busy || Boolean(missingClientEnv.length)}>{busy ? "Please wait…" : mode === "login" ? "Sign in with email" : "Create account"}</button>
            </form>
            <div className="accountDivider"><span>or</span></div>
            <button className="accountMenu__secondary" type="button" onClick={signInWithGoogle} disabled={!auth || busy || Boolean(missingClientEnv.length)}>
              <span className="accountMenu__googleMark" aria-hidden="true">G</span>
              <span>Continue with Google</span>
            </button>
            <p className="accountAuthModal__helper">
              {mode === "login" ? "Don’t have an account? " : "Already have an account? "}
              <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Sign up" : "Login"}</button>
            </p>
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
