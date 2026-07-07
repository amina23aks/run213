export const firebaseClientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

type RequiredServerEnvKey =
  | "FIREBASE_PROJECT_ID"
  | "FIREBASE_CLIENT_EMAIL"
  | "FIREBASE_PRIVATE_KEY";

function readRequiredServerEnv(key: RequiredServerEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }

  return value;
}

export function getFirebaseAdminEnv() {
  return {
    projectId: readRequiredServerEnv("FIREBASE_PROJECT_ID"),
    clientEmail: readRequiredServerEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: readRequiredServerEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

export function getAdminEmailEnv() {
  return {
    adminEmails: (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  };
}
