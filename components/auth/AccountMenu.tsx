"use client";

import Link from "next/link";
import type { Auth, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AdminState = "unknown" | "checking" | "yes" | "no";
type AuthMode = "login" | "signup";

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminState, setAdminState] = useState<AdminState>("unknown");
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : null);

  useEffect(() => {
    if (missingClientEnv.length) return;

    let unsubscribe: (() => void) | undefined;

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        setAuth(client.auth);
        unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => {
          setUser(nextUser);
          setAdminState(nextUser ? "checking" : "unknown");
          setMessage(null);
        });
      })
      .catch(() => setMessage("Firebase Auth could not be initialized."));

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!user) return;

    user.getIdToken()
      .then((token) => fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } }))
      .then((response) => setAdminState(response.ok ? "yes" : "no"))
      .catch(() => setAdminState("no"));
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
  }

  async function signInWithGoogle() {
    if (!auth) return;
    setBusy(true);
    setMessage(null);

    try {
      const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/client"),
      ]);
      await signInWithPopup(auth, googleProvider);
    } catch {
      setMessage("Google sign in was not completed. Try again or use email.");
    } finally {
      setBusy(false);
    }
  }

  async function submitEmailAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!auth) return;

    if (!email.trim()) {
      setMessage("Enter your email address.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const authModule = await import("firebase/auth");
      if (mode === "login") {
        await authModule.signInWithEmailAndPassword(auth, email, password);
      } else {
        await authModule.createUserWithEmailAndPassword(auth, email, password);
      }
      setPassword("");
    } catch {
      setMessage(mode === "login" ? "Email sign in failed. Check your email and password." : "Account creation failed. Check Firebase Email/Password settings.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutUser() {
    if (!auth) return;
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    setAdminState("unknown");
    setIsOpen(false);
  }

  return (
    <div className="accountMenu">
      <button
        className="accountMenu__trigger"
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <IconUser />
      </button>

      {isOpen ? (
        <div className="accountModal" role="dialog" aria-modal="true" aria-label="Account menu">
          <button className="accountModal__backdrop" type="button" aria-label="Close account menu" onClick={() => setIsOpen(false)} />
          <section className="accountModal__panel">
            <button className="accountModal__close" type="button" aria-label="Close" onClick={() => setIsOpen(false)}>×</button>
            <p className="accountMenu__eyebrow">ACCOUNT</p>
            <h2>{user ? "Your 213 RUN account" : "Welcome to 213 RUN"}</h2>
            <p className="accountModal__intro">Built. Not found. Sign in to manage your RUN 213 experience.</p>

            {user ? (
              <div className="accountMenu__signedIn">
                <div className="accountMenu__identity">
                  <span>Email</span>
                  <strong>{user.email}</strong>
                </div>
                <div className="accountMenu__links">
                  {adminState === "checking" ? <p className="accountMenu__muted">Checking admin access…</p> : null}
                  {adminState === "yes" ? <Link className="accountMenu__link accountMenu__link--admin" href="/admin/products" onClick={() => setIsOpen(false)}>Admin products →</Link> : null}
                </div>
                <button className="accountMenu__secondary" type="button" onClick={signOutUser}>Sign out</button>
              </div>
            ) : (
              <div className="accountMenu__signedOut">
                <div className="accountTabs" role="tablist" aria-label="Auth mode">
                  <button type="button" className={mode === "login" ? "isActive" : undefined} onClick={() => switchMode("login")}>Login</button>
                  <button type="button" className={mode === "signup" ? "isActive" : undefined} onClick={() => switchMode("signup")}>Sign up</button>
                </div>

                <form className="accountMenu__form" onSubmit={submitEmailAuth} noValidate>
                  <label>
                    <span>Email</span>
                    <input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
                  </label>
                  <label>
                    <span>Password</span>
                    <input type="password" placeholder="Minimum 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                  </label>
                  <button className="accountMenu__primary" type="submit" disabled={!auth || busy || Boolean(missingClientEnv.length)}>{busy ? "Please wait…" : mode === "login" ? "Sign in with email" : "Create account"}</button>
                </form>

                <div className="accountDivider"><span>or</span></div>
                <button className="accountMenu__secondary" type="button" onClick={signInWithGoogle} disabled={!auth || busy || Boolean(missingClientEnv.length)}>
                  Continue with Google
                </button>
              </div>
            )}
            {message ? <p className="accountMenu__message">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function IconUser() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.3-4.1 4-6.2 7-6.2s5.7 2.1 7 6.2" />
    </svg>
  );
}
