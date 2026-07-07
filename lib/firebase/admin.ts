import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { getRequiredServerEnv } from "@/lib/env";

function getPrivateKey(): string {
  return getRequiredServerEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
}

function initializeFirebaseAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: getRequiredServerEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredServerEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getPrivateKey(),
    }),
  });
}

export const adminApp = initializeFirebaseAdmin();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
