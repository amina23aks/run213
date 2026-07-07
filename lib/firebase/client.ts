import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseClientEnv } from "@/lib/env";

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseClientEnv.apiKey,
  authDomain: firebaseClientEnv.authDomain,
  projectId: firebaseClientEnv.projectId,
  storageBucket: firebaseClientEnv.storageBucket,
  messagingSenderId: firebaseClientEnv.messagingSenderId,
  appId: firebaseClientEnv.appId,
};

export const firebaseApp: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});
