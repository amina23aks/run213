"use client";

import Link from "next/link";
import type { Auth, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AdminState = "unknown" | "checking" | "yes" | "no";

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminState, setAdminState] = useState<AdminState>("unknown");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : null);

  useEffect(() => {
    if (missingClientEnv.length) {
      return;
    }

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
      .then((response) => {
        setAdminState(response.ok ? "yes" : "no");
      })
      .catch(() => setAdminState("no"));
  }, [user]);

  async function signInWithGoogle() {
    if (!auth) return;
    const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase/client"),
    ]);
    await signInWithPopup(auth, googleProvider);
  }

  async function signInWithEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!auth) return;

    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch {
      setMessage("Email sign in failed. Check the email, password, and Firebase provider settings.");
    }
  }

  async function createAccount() {
    if (!auth) return;

    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      await createUserWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch {
      setMessage("Account creation failed. Check Firebase Email/Password settings.");
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
        <div className="accountMenu__panel" role="dialog" aria-label="Account menu">
          <div className="accountMenu__eyebrow">ACCOUNT</div>
          {user ? (
            <div className="accountMenu__signedIn">
              <p className="accountMenu__email">{user.email}</p>
              {adminState === "checking" ? <p className="accountMenu__muted">Checking admin access…</p> : null}
              {adminState === "yes" ? <Link className="accountMenu__link" href="/admin/products" onClick={() => setIsOpen(false)}>Admin products →</Link> : null}
              <button type="button" onClick={signOutUser}>Sign out</button>
            </div>
          ) : (
            <div className="accountMenu__signedOut">
              <button className="adminPrimary" type="button" onClick={signInWithGoogle} disabled={!auth || Boolean(missingClientEnv.length)}>
                Sign in with Google
              </button>
              <form className="accountMenu__form" onSubmit={signInWithEmail}>
                <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="submit" disabled={!auth || Boolean(missingClientEnv.length)}>Sign in with email</button>
                <button type="button" onClick={createAccount} disabled={!auth || Boolean(missingClientEnv.length)}>Create account</button>
              </form>
            </div>
          )}
          {message ? <p className="accountMenu__message">{message}</p> : null}
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
