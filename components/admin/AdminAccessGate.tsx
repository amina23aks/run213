"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getMissingFirebaseClientEnv } from "@/lib/env";

const missingClientEnv = getMissingFirebaseClientEnv();

type AdminAccessGateProps = {
  children: ReactNode;
};

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const verificationRef = useRef(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(() => missingClientEnv.length === 0);
  const [message, setMessage] = useState(() => missingClientEnv.length ? `Missing Firebase env: ${missingClientEnv.join(", ")}` : "Verifying your signed-in account.");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    if (missingClientEnv.length) {
      return () => undefined;
    }

    Promise.all([import("@/lib/firebase/client"), import("firebase/auth")])
      .then(([client, authModule]) => {
        void authModule.getRedirectResult(client.auth).catch(() => undefined);

        unsubscribe = authModule.onIdTokenChanged(client.auth, (nextUser) => {
          if (cancelled) return;
          const verification = ++verificationRef.current;
          setIsAdmin(false);
          setIsChecking(true);

          if (!nextUser) {
            const returnTo = pathname.startsWith("/admin") ? pathname : "/admin";
            router.replace(`/account?returnTo=${encodeURIComponent(returnTo)}`);
            return;
          }

          nextUser.getIdToken(true)
            .then((token) => fetch("/api/admin/me", { headers: { Authorization: `Bearer ${token}` } }))
            .then((response) => response.ok ? response.json() : Promise.reject(new Error(String(response.status))))
            .then((data: { isAdmin?: boolean }) => {
              if (cancelled || verification !== verificationRef.current) return;
              if (data.isAdmin !== true) throw new Error("403");
              setIsAdmin(true);
              setIsChecking(false);
            })
            .catch(() => {
              if (cancelled || verification !== verificationRef.current) return;
              setIsAdmin(false);
              router.replace("/?adminAccess=required");
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
  }, [pathname, router]);

  if (isChecking || !isAdmin) {
    return (
      <main className="adminAuthState" role="status" aria-live="polite">
        <div className="adminAuthState__mark" aria-hidden="true">213</div>
        <div>
          <p>RUN213</p>
          <h1>{missingClientEnv.length ? "Authentication unavailable" : "Checking access"}</h1>
          <span>{message}</span>
        </div>
      </main>
    );
  }

  return children;
}
