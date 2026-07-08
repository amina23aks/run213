import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getAdminEmailEnv, getFirebaseAdminEnv } from "@/lib/env";

let firebaseAdminApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

function getFirebaseAdminApp(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  const adminEnv = getFirebaseAdminEnv();
  firebaseAdminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: adminEnv.projectId,
          clientEmail: adminEnv.clientEmail,
          privateKey: adminEnv.privateKey,
        }),
        projectId: adminEnv.projectId,
      });

  return firebaseAdminApp;
}

export function getAdminAuth(): Auth {
  cachedAuth ??= getAuth(getFirebaseAdminApp());
  return cachedAuth;
}

export function getAdminDb(): Firestore {
  cachedDb ??= getFirestore(getFirebaseAdminApp());
  return cachedDb;
}

export const { adminEmails, superAdminEmail } = getAdminEmailEnv();

export function isConfiguredAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();

  return normalizedEmail === superAdminEmail || adminEmails.includes(normalizedEmail);
}
