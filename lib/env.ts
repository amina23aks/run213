export const firebaseClientEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const firebaseClientEnvKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

type FirebaseClientEnvKey = (typeof firebaseClientEnvKeys)[number];

type RequiredServerEnvKey =
  | "FIREBASE_PROJECT_ID"
  | "FIREBASE_CLIENT_EMAIL"
  | "FIREBASE_PRIVATE_KEY";

export const firebaseAdminEnvKeys: RequiredServerEnvKey[] = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];

const clientEnvKeyToValue = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseClientEnv.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseClientEnv.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseClientEnv.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseClientEnv.storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseClientEnv.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseClientEnv.appId,
} satisfies Record<FirebaseClientEnvKey, string>;

export function getMissingFirebaseClientEnv(): FirebaseClientEnvKey[] {
  return firebaseClientEnvKeys.filter((key) => !clientEnvKeyToValue[key]);
}

export function getMissingFirebaseAdminEnv(): RequiredServerEnvKey[] {
  return firebaseAdminEnvKeys.filter((key) => !process.env[key]);
}

export function isFirebaseClientConfigured(): boolean {
  return getMissingFirebaseClientEnv().length === 0;
}

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
