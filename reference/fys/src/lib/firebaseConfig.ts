type FirebaseEnvConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  measurementId?: string;
};

const envValue = (primary: string | undefined, fallback: string | undefined) => primary ?? fallback;

export function isFirebaseConfigured(): boolean {
  return [
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? process.env.FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? process.env.FIREBASE_APP_ID,
  ].every(Boolean);
}

function missingEnvError(missing: string[]): Error {
  return new Error(
    `Firebase is not configured. Missing variables: ${missing.join(", ")}. Please check your environment settings.`,
  );
}

export function getFirebaseConfig(): FirebaseEnvConfig {
  const apiKey = envValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, process.env.FIREBASE_API_KEY);
  const authDomain = envValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, process.env.FIREBASE_AUTH_DOMAIN);
  const projectId = envValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, process.env.FIREBASE_PROJECT_ID);
  const storageBucket = envValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, process.env.FIREBASE_STORAGE_BUCKET);
  const appId = envValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, process.env.FIREBASE_APP_ID);
  const measurementId = envValue(
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    process.env.FIREBASE_MEASUREMENT_ID,
  );

  if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
    const missing = [] as string[];
    if (!apiKey) missing.push("FIREBASE_API_KEY");
    if (!authDomain) missing.push("FIREBASE_AUTH_DOMAIN");
    if (!projectId) missing.push("FIREBASE_PROJECT_ID");
    if (!storageBucket) missing.push("FIREBASE_STORAGE_BUCKET");
    if (!appId) missing.push("FIREBASE_APP_ID");

    throw missingEnvError(missing);
  }

  return { apiKey, authDomain, projectId, storageBucket, appId, measurementId };
}
