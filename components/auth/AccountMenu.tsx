"use client";

import Link from "next/link";
import type { Auth, User } from "firebase/auth";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { getAuthErrorMessage, extractFirebaseAuthCode, shouldFallbackToRedirect } from "@/lib/auth-errors";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AdminState = "unknown" | "checking" | "yes" | "no";
type AuthMode = "login" | "signup";
type FormErrors = { email?: string; password?: string };

export function AccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminState, setAdminState] = useState<AdminState>("unknown");
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : null);

  const modalTitle = useMemo(() => {
    if (user) return "Your account";
    return mode === "login" ? "Welcome back" : "Join 213 RUN";
  }, [mode, user]);

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
          setAdminState(nextUser ? "checking" : "unknown");
          setMessage(null);
          setFormErrors({});
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
      if (event.key === "Escape" && !busy) setIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, isOpen]);

  function closeModal() {
    if (busy) return;
    setIsOpen(false);
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
      if (code === "auth/popup-closed-by-user") {
        setMessage(null);
      } else {
        setMessage(getAuthErrorMessage(code));
      }
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
      setAdminState("unknown");
      setIsOpen(false);
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
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <IconUser />
      </button>

      {isOpen ? (
        <div className="accountModal" role="dialog" aria-modal="true" aria-label="Account menu">
          <button className="accountModal__backdrop" type="button" aria-label="Close account menu" onClick={closeModal} />
          <section className="accountModal__panel">
            <button className="accountModal__close" type="button" aria-label="Close account menu" onClick={closeModal} disabled={busy}>
              <IconClose />
            </button>

            <div className="accountModal__header">
              <p className="accountMenu__eyebrow">ACCOUNT</p>
              <h2>{modalTitle}</h2>
              <p className="accountModal__intro">BUILT. NOT FOUND. Manage orders, saved pieces, and admin access from one clean account panel.</p>
            </div>

            {user ? (
              <SignedInPanel
                adminState={adminState}
                busy={busy}
                email={user.email ?? "Signed in"}
                onClose={() => setIsOpen(false)}
                onSignOut={signOutUser}
              />
            ) : (
              <SignedOutPanel
                authReady={Boolean(auth) && !missingClientEnv.length}
                busy={busy}
                email={email}
                formErrors={formErrors}
                mode={mode}
                onEmailChange={setEmail}
                onGoogle={signInWithGoogle}
                onModeChange={switchMode}
                onPasswordChange={setPassword}
                onSubmit={submitEmailAuth}
                password={password}
              />
            )}

            {message ? <p className="accountMenu__message" role="alert">{message}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SignedOutPanel({
  authReady,
  busy,
  email,
  formErrors,
  mode,
  onEmailChange,
  onGoogle,
  onModeChange,
  onPasswordChange,
  onSubmit,
  password,
}: {
  authReady: boolean;
  busy: boolean;
  email: string;
  formErrors: FormErrors;
  mode: AuthMode;
  onEmailChange: (value: string) => void;
  onGoogle: () => void;
  onModeChange: (mode: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
}) {
  return (
    <div className="accountMenu__signedOut">
      <div className="accountTabs" role="tablist" aria-label="Auth mode">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "isActive" : undefined} onClick={() => onModeChange("login")}>
          Login
        </button>
        <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "isActive" : undefined} onClick={() => onModeChange("signup")}>
          Sign up
        </button>
      </div>

      <form className="accountMenu__form" onSubmit={onSubmit} noValidate>
        <label>
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(formErrors.email)}
          />
          {formErrors.email ? <small>{formErrors.email}</small> : null}
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            aria-invalid={Boolean(formErrors.password)}
          />
          {formErrors.password ? <small>{formErrors.password}</small> : null}
        </label>
        <button className="accountMenu__primary" type="submit" disabled={!authReady || busy}>
          {busy ? "Please wait…" : mode === "login" ? "Login with email" : "Create account"}
        </button>
      </form>

      <div className="accountDivider"><span>or</span></div>
      <button className="accountMenu__secondary" type="button" onClick={onGoogle} disabled={!authReady || busy}>
        <span className="accountMenu__googleMark" aria-hidden="true">G</span>
        <span>Continue with Google</span>
      </button>
    </div>
  );
}

function SignedInPanel({
  adminState,
  busy,
  email,
  onClose,
  onSignOut,
}: {
  adminState: AdminState;
  busy: boolean;
  email: string;
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="accountMenu__signedIn">
      <div className="accountMenu__identity">
        <span>Email</span>
        <strong>{email}</strong>
      </div>
      <div className="accountMenu__links">
        <Link className="accountMenu__link" href="/orders" onClick={onClose}>My orders <span>→</span></Link>
        <Link className="accountMenu__link" href="/favorites" onClick={onClose}>Favorites <span>→</span></Link>
        {adminState === "checking" ? <p className="accountMenu__muted">Checking admin access…</p> : null}
        {adminState === "yes" ? <Link className="accountMenu__link accountMenu__link--admin" href="/admin/products" onClick={onClose}>Admin products <span>→</span></Link> : null}
      </div>
      <button className="accountMenu__secondary" type="button" onClick={onSignOut} disabled={busy}>Sign out</button>
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

function IconClose() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
