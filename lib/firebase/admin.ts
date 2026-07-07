import "server-only";

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getAdminEmailEnv, getFirebaseAdminEnv } from "@/lib/env";

const adminEnv = getFirebaseAdminEnv();

export const firebaseAdminApp: App = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: adminEnv.projectId,
        clientEmail: adminEnv.clientEmail,
        privateKey: adminEnv.privateKey,
      }),
      projectId: adminEnv.projectId,
    });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);

export const { adminEmails, superAdminEmail } = getAdminEmailEnv();

export function isConfiguredAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  return normalizedEmail === superAdminEmail || adminEmails.includes(normalizedEmail);
}
