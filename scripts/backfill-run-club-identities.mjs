import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) throw new Error("Missing Firebase Admin env vars.");
if (!getApps().length) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
const db = getFirestore();
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function normalizeInstagram(value) { const raw = value?.trim(); if (!raw) return null; let username = raw.toLowerCase(); try { const url = new URL(username.startsWith("http") ? username : `https://${username}`); if (url.hostname === "instagram.com" || url.hostname === "www.instagram.com") username = url.pathname.split("/").filter(Boolean)[0] ?? ""; } catch {} username = username.split("?")[0]?.replace(/^@/, "").replace(/\/$/, "") ?? ""; return /^[a-z0-9._]{1,30}$/.test(username) ? username : null; }
function identityHash(monthKey, type, value) { return sha256(`${monthKey}:${type}:${value}`); }
const snapshot = await db.collection("runClubSubmissions").get();
let writes = 0, conflicts = 0;
for (const doc of snapshot.docs) {
  const data = doc.data(); const monthKey = data.monthKey; const normalizedContact = data.normalizedContact;
  if (!monthKey || !normalizedContact) { console.log(`skip ${doc.id}: missing month/contact`); continue; }
  const normalizedInstagram = normalizeInstagram(data.instagram); const instagramHash = normalizedInstagram ? identityHash(monthKey, "instagram", normalizedInstagram) : null; const contactHash = identityHash(monthKey, "contact", normalizedContact);
  const locks = [{ type: "contact", hash: contactHash, ref: db.collection("runClubSubmissionKeys").doc(`${monthKey}_contact_${contactHash}`) }];
  if (instagramHash) locks.push({ type: "instagram", hash: instagramHash, ref: db.collection("runClubSubmissionKeys").doc(`${monthKey}_instagram_${instagramHash}`) });
  for (const lock of locks) {
    const existing = await lock.ref.get();
    if (existing.exists && existing.get("submissionId") !== doc.id) { conflicts++; console.log(`conflict ${lock.type} ${doc.id} locked by ${existing.get("submissionId")}`); continue; }
    if (!existing.exists) { writes++; console.log(`${apply ? "create" : "would create"} ${lock.ref.path}`); if (apply) await lock.ref.create({ type: lock.type, monthKey, identityHash: lock.hash, submissionId: doc.id, createdAt: FieldValue.serverTimestamp() }); }
  }
  writes++; console.log(`${apply ? "update" : "would update"} ${doc.ref.path}`); if (apply) await doc.ref.set({ normalizedInstagram, instagramHash, publicName: data.publicName ?? data.name ?? "Runner", publicCaption: data.publicCaption ?? data.caption ?? null, publicWilaya: data.publicWilaya ?? data.wilaya ?? null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", scanned: snapshot.size, plannedWrites: writes, conflicts }, null, 2));
