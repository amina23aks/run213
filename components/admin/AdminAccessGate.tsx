"use client";

import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { extractFirebaseAuthCode, getAuthErrorMessage } from "@/lib/auth-errors";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AdminAccessGateProps = {
  children: ReactNode;
};

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(() => missingClientEnv.length === 0);
  const [message, setMessage] = useState(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : "Checking admin access…");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    if (missingClientEnv.length) {
      return () => undefined;
    }

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        authModule.getRedirectResult(client.auth)
          .catch((error: unknown) => setMessage(getAuthErrorMessage(extractFirebaseAuthCode(error))));

        unsubscribe = authModule.onAuthStateChanged(client.auth, (nextUser) => {
          if (cancelled) return;
          setUser(nextUser);
          setIsAdmin(false);

          if (!nextUser) {
            setMessage("Admin access required. Sign in from the account icon, then return to this page.");
            setIsChecking(false);
            return;
          }

          setIsChecking(true);
          nextUser.getIdToken()
            .then((token) => fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } }))
            .then((response) => response.ok ? response.json() : Promise.reject(new Error("Access denied")))
            .then((data: { isAdmin?: boolean }) => {
              if (cancelled) return;
              setIsAdmin(data.isAdmin === true);
              setMessage(data.isAdmin === true ? "" : "Admin access required. Sign in from the account icon, then return to this page.");
            })
            .catch(() => {
              if (cancelled) return;
              setIsAdmin(false);
              setMessage("Admin access required. Sign in from the account icon, then return to this page.");
            })
            .finally(() => {
              if (!cancelled) setIsChecking(false);
            });
        });
      })
      .catch(() => {
        setMessage("Firebase client env is missing.");
        setIsChecking(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  if (isChecking) {
    return (
      <section className="adminAccessState adminCard">
        <div className="adminCard__heading">
          <p>ADMIN ACCESS</p>
          <h2>Checking access</h2>
          <span>Verifying your signed-in account.</span>
        </div>
      </section>
    );
  }

  if (!user || !isAdmin) {
    return (
      <section className="adminAccessState adminCard">
        <div className="adminCard__heading">
          <p>ADMIN ACCESS</p>
          <h2>Admin access required</h2>
          <span>Sign in from the account icon, then return to this page.</span>
        </div>
        {missingClientEnv.length ? <p className="adminNotice adminNotice--error">Missing client env: {missingClientEnv.join(", ")}</p> : null}
        <p className="adminNotice">{message}</p>
      </section>
    );
  }

  return children;
}
