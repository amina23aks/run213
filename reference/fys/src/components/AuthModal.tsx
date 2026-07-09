"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth";
import { useAuthModal } from "@/context/auth-modal";
import { getAuthErrorMessage } from "@/lib/auth-errors";

// Helper to extract the best auth code
function extractAuthCode(err: unknown): string {
  if (!err) return "unknown";

  if (typeof err === "object" && err !== null) {
    if ("code" in err && typeof (err as { code?: unknown }).code === "string") {
      return (err as { code: string }).code;
    }

    if (
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
    ) {
      // Example message: "Firebase: Error (auth/invalid-credential)."
      const match = (err as { message: string }).message.match(/\((auth\/[^)]+)\)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  return "unknown";
}

type Mode = "login" | "signup";

export default function AuthModal() {
  const { signIn, register, signInWithGoogle } = useAuth();
  const { isOpen, closeModal, returnTo } = useAuthModal();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inputErrors, setInputErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const safeReturnTo = useMemo(() => {
    if (returnTo && returnTo.startsWith("/")) {
      return returnTo;
    }
    return "/";
  }, [returnTo]);

  useEffect(() => {
    if (!isOpen) return;
    setMode("login");
    setEmail("");
    setPassword("");
    setInputErrors({});
    setError(null);
    setBusy(false);
  }, [isOpen]);

  const handleTabSwitch = (nextMode: Mode) => {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setInputErrors({});
    setError(null);
  };

  const handleClose = () => {
    if (busy) return;
    closeModal();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setInputErrors({});
    setError(null);
    setBusy(true);

    if (mode === "signup") {
      const errs: { email?: string; password?: string } = {};
      if (!email) errs.email = "Please enter your email address.";
      if (password.length < 6) errs.password = "Password must be at least 6 characters.";
      setInputErrors(errs);
      if (Object.keys(errs).length > 0) {
        setBusy(false);
        return;
      }
    }

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await register(email, password);
      }
      closeModal();
      router.push(safeReturnTo);
    } catch (err: unknown) {
      const code = extractAuthCode(err);
      setError(getAuthErrorMessage(code));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      closeModal();
      router.push(safeReturnTo);
    } catch (err: unknown) {
      const code = extractAuthCode(err);
      if (code === "auth/popup-closed-by-user") {
        setError(null);
      } else {
        setError(getAuthErrorMessage(code));
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-sky-950/85 px-4 py-8"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
        aria-label="Close modal"
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/95 p-6 text-sky-50 shadow-lg shadow-sky-900/25">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>

        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200">Account</p>
            <h2 className="text-2xl font-semibold text-white">Welcome to Fish Your Style</h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm shadow-white/30"
                  : "border border-white/20 text-white hover:-translate-y-0.5 hover:bg-white/10"
              }`}
              onClick={() => handleTabSwitch("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-1.5 transition ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm shadow-white/30"
                  : "border border-white/20 text-white hover:-translate-y-0.5 hover:bg-white/10"
              }`}
              onClick={() => handleTabSwitch("signup")}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1">
              <label htmlFor="auth-email" className="text-xs font-medium text-sky-100">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full rounded-lg border ${
                  inputErrors.email
                    ? "border-rose-400 bg-rose-100 text-rose-900 placeholder:text-rose-400"
                    : "border-white/15 bg-white/10 text-white placeholder:text-sky-200"
                } px-3 py-2 text-sm shadow-inner shadow-sky-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                required
                autoComplete={mode === "signup" ? "new-email" : "email"}
              />
              {inputErrors.email && (
                <div className="text-xs text-rose-200 mt-1">{inputErrors.email}</div>
              )}
            </div>

            {mode === "signup" && (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-200">
                This password is only for your Fish Your Style account. It is not your email account password.
              </p>
            )}

            <div className="space-y-1">
              <label htmlFor="auth-password" className="text-xs font-medium text-sky-100">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`w-full rounded-lg border ${
                  inputErrors.password
                    ? "border-rose-400 bg-rose-100 text-rose-900 placeholder:text-rose-400"
                    : "border-white/15 bg-white/10 text-white placeholder:text-sky-200"
                } px-3 py-2 text-sm shadow-inner shadow-sky-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {inputErrors.password && (
                <div className="text-xs text-rose-200 mt-1">{inputErrors.password}</div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200/60 bg-rose-500/15 px-3 py-2 text-xs text-rose-50 shadow-inner shadow-rose-900/30">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm shadow-sky-900/20 transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (mode === "signup" ? "Creating account..." : "Signing in...") : mode === "login" ? "Login" : "Sign up"}
            </button>
          </form>

          <div className="space-y-2">
            <p className="text-center text-xs text-sky-200">or</p>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-inner shadow-sky-900/20 transition hover:-translate-y-0.5 hover:bg-white/15"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.6l6.91-6.91C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.99 6.2C12.43 12.7 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.57-.15-3.09-.43-4.56H24v9.11h12.65c-.55 2.98-2.24 5.51-4.76 7.21l7.44 5.79C43.73 38.77 46.5 32.1 46.5 24.5z" />
                <path fill="#FBBC05" d="M10.54 28.98c-.48-1.42-.75-2.94-.75-4.48s.27-3.06.75-4.48l-7.99-6.2C.92 16.87 0 20.35 0 24c0 3.65.92 7.13 2.56 10.18l7.98-6.2z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.79l-7.44-5.79c-2.06 1.38-4.71 2.19-7.77 2.19-6.26 0-11.57-4.2-13.45-9.87l-7.99 6.2C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
