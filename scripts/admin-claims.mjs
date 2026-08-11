import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { pathToFileURL } from "node:url";

export function claimsWithAdminGranted(existingClaims) {
  return { ...existingClaims, admin: true };
}

export function claimsWithAdminRevoked(existingClaims) {
  const remainingClaims = { ...existingClaims };
  delete remainingClaims.admin;
  return remainingClaims;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function readEmail(args) {
  const index = args.indexOf("--email");
  const email = index >= 0 ? args[index + 1]?.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) throw new Error("Provide an existing Firebase Auth email with --email user@example.com");
  return email;
}

export async function manageAdminClaim({ action, email, auth }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
      throw new Error(`Firebase Auth user does not exist: ${email}`);
    }
    throw error;
  }

  const currentClaims = user.customClaims ?? {};
  const nextClaims = action === "grant" ? claimsWithAdminGranted(currentClaims) : claimsWithAdminRevoked(currentClaims);
  await auth.setCustomUserClaims(user.uid, nextClaims);
  const updated = await auth.getUser(user.uid);
  const succeeded = action === "grant" ? updated.customClaims?.admin === true : !("admin" in (updated.customClaims ?? {}));
  if (!succeeded) throw new Error(`Admin claim ${action} verification failed.`);
  return { uid: user.uid, email: user.email ?? email, action };
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (action !== "grant" && action !== "revoke") throw new Error("Expected action: grant or revoke");
  const email = readEmail(args);
  const app = getApps()[0] ?? initializeApp({ credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }) });
  const result = await manageAdminClaim({ action, email, auth: getAuth(app) });
  console.log(`Admin claim ${result.action} confirmed for UID ${result.uid} (${result.email}).`);
  console.log("The affected user must sign out and back in, or force-refresh their ID token.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin claim update failed.");
    process.exitCode = 1;
  });
}
