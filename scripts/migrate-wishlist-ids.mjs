import { createHmac } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const dryRun = process.argv.includes("--dry-run");
const pepper = readPepper();
const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: required("FIREBASE_PROJECT_ID"),
    clientEmail: required("FIREBASE_CLIENT_EMAIL"),
    privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
const snapshot = await db.collection("wishlistSignups").get();
let migrated = 0;
let skipped = 0;

for (const legacy of snapshot.docs) {
  const email = typeof legacy.get("email") === "string" ? legacy.get("email").trim().toLowerCase() : "";
  if (!email) { skipped += 1; continue; }
  const opaqueId = createHmac("sha256", pepper).update(email, "utf8").digest("hex");
  if (legacy.id === opaqueId) { skipped += 1; continue; }
  if (!dryRun) {
    await db.runTransaction(async (transaction) => {
      const replacement = db.collection("wishlistSignups").doc(opaqueId);
      const current = await transaction.get(replacement);
      const preserved = { ...legacy.data(), ...(current.exists ? current.data() : {}), email };
      transaction.set(replacement, preserved, { merge: true });
      transaction.delete(legacy.ref);
    });
  }
  migrated += 1;
}

console.log(`${dryRun ? "Dry run complete" : "Migration complete"}: ${migrated} migration(s), ${skipped} skipped.`);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function readPepper() {
  const decoded = Buffer.from(required("WISHLIST_ID_PEPPER"), "base64");
  if (decoded.byteLength < 32) throw new Error("WISHLIST_ID_PEPPER must contain at least 32 random bytes encoded as base64.");
  return decoded;
}
