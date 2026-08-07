import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const db = getFirestore(app);

const counts = new Map();
for (const [collection, type] of [["productFavorites", "product"], ["lookFavorites", "look"]]) {
  const snapshot = await db.collectionGroup(collection).get();
  snapshot.docs.forEach((doc) => { const itemId = String(doc.get("itemId") || doc.id); const key = `${type}_${itemId}`; counts.set(key, { type, itemId, count: (counts.get(key)?.count ?? 0) + 1 }); });
}
let batch = db.batch(); let pending = 0;
for (const [id, value] of counts) { batch.set(db.collection("favoriteAggregates").doc(id), { ...value, updatedAt: FieldValue.serverTimestamp() }); pending += 1; if (pending === 450) { await batch.commit(); batch = db.batch(); pending = 0; } }
if (pending) await batch.commit();
console.log(`Backfilled ${counts.size} favorite aggregate documents.`);
