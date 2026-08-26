import { readFile } from "node:fs/promises";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { executePlan, planImport } from "./products-import-lib.mjs";

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const filename = fileIndex >= 0 ? args[fileIndex + 1] : null;
const write = args.includes("--write");
if (!filename) { console.error("Usage: npm run products:import -- --file <local-json> [--write]"); process.exit(1); }

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) { console.error(`Missing Firebase Admin environment variables: ${missing.join(", ")}`); process.exit(1); }
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const db = getFirestore(app);
const repository = {
  async findBySlug(slug) { const snap = await db.collection("products").where("slug", "==", slug).limit(2).get(); return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })); },
  async getReferencedColorIds(productId) {
    const [looks, collections] = await Promise.all([db.collection("looks").where("productIds", "array-contains", productId).limit(50).get(), db.collection("lookCollections").limit(50).get()]);
    const ids = new Set();
    for (const doc of [...looks.docs, ...collections.docs]) collectColorIds(doc.data(), productId, ids);
    return [...ids];
  },
  async create(patch) { const ref = db.collection("products").doc(); await ref.set({ ...patch, sortOrder: await nextSortOrder(), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: "local-product-import" }); },
  async update(id, patch) { await db.collection("products").doc(id).update({ ...patch, updatedAt: FieldValue.serverTimestamp(), updatedBy: "local-product-import" }); },
};
async function nextSortOrder() { const snap = await db.collection("products").orderBy("sortOrder", "desc").limit(1).get(); return (Number(snap.docs[0]?.get("sortOrder")) || 0) + 10; }
function collectColorIds(value, productId, output) { if (Array.isArray(value)) return value.forEach((item) => collectColorIds(item, productId, output)); if (!value || typeof value !== "object") return; if (value.productId === productId && typeof value.colorId === "string") output.add(value.colorId); Object.values(value).forEach((item) => collectColorIds(item, productId, output)); }

let input;
try { input = JSON.parse(await readFile(filename, "utf8")); } catch (error) { console.error(`Unable to read import file: ${error instanceof Error ? error.message : "unknown error"}`); process.exit(1); }
const report = await planImport(input, repository);
const counts = (action) => report.plans.filter((plan) => plan.action === action).length;
console.log(`Mode: ${write ? "WRITE" : "DRY RUN (zero writes)"}`);
console.log(`Total products parsed: ${report.total}`);
console.log(`Products valid: ${counts("CREATE") + counts("UPDATE")}`);
console.log(`Products incomplete: ${counts("SKIP")}`);
console.log(`CREATE: ${counts("CREATE")} | UPDATE: ${counts("UPDATE")} | SKIP: ${counts("SKIP")}`);
console.log(`Duplicate slugs: ${report.duplicates.length ? report.duplicates.join(", ") : "none"}`);
report.catalogIssues.forEach((issue) => console.log(`CATALOG SKIP — ${issue}`));
for (const plan of report.plans) console.log(`${plan.slug}: ${plan.action} | images=${plan.imageCount}${plan.issues.length ? ` | ${plan.issues.join("; ")}` : ""}`);
const writes = await executePlan(report, repository, write);
console.log(`Firestore writes: ${writes}`);
