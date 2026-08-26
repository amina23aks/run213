import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canonicalCreate, executePlan, parseCloudinaryPublicId, planImport, toCanonicalPatch, validateCatalog } from "../scripts/products-import-lib.mjs";

const url = (name) => `https://res.cloudinary.com/run213/image/upload/q_auto/v123/run213/products/${name}.jpg`;
const valid = (overrides = {}) => ({
  name: "Tshirt Oversized", slug: "tshirt-oversized", category: "tshirts", description: "Premium cotton oversized tee.",
  basePriceDzd: 3000, costPriceDzd: 1400, stockMode: "limited", stockQty: 8, sizes: ["S", "M", "L", "XL", "XXL"],
  colors: [{ id: "noir", name: "Noir", hex: "#111111", images: [url("front"), url("back")] }], ...overrides,
});
const repository = (existing = []) => ({
  writes: [], async findBySlug(slug) { return existing.filter((product) => product.slug === slug); },
  async getReferencedColorIds() { return []; }, async create(patch) { this.writes.push(["products:create", patch]); },
  async update(id, patch) { this.writes.push(["products:update", id, patch]); },
});

test("staging validation accepts complete products and refuses incomplete/null prices without zero coercion", () => {
  assert.equal(validateCatalog([valid()]).entries[0].issues.length, 0);
  for (const product of [valid({ description: "" }), valid({ costPriceDzd: null }), valid({ basePriceDzd: null }), valid({ stockQty: null })]) {
    const result = validateCatalog([product]).entries[0];
    assert.ok(result.issues.length > 0); assert.equal(result.product, null);
  }
});

test("one or multiple images per color become ordered canonical records with one primary", () => {
  const patch = toCanonicalPatch(valid({ colors: [
    { id: "noir", name: "Noir", hex: "#111111", images: [url("black-front"), url("black-back")] },
    { id: "beige", name: "Beige", hex: "#D9C9A3", images: [url("beige-front")] },
  ] }));
  assert.deepEqual(patch.images.map(({ colorId }) => colorId), ["noir", "noir", "beige"]);
  assert.deepEqual(patch.images.map(({ isPrimary }) => isPrimary), [true, false, false]);
  assert.deepEqual(patch.images.map(({ sortOrder }) => sortOrder), [0, 1, 2]);
  assert.equal(new Set(patch.images.map(({ id }) => id)).size, 3);
});

test("Cloudinary public ID parser handles transformations, versions, folders, and invalid hosts", () => {
  assert.equal(parseCloudinaryPublicId(url("front")), "run213/products/front");
  assert.equal(parseCloudinaryPublicId("http://res.cloudinary.com/x/image/upload/v1/a.jpg"), null);
  assert.equal(parseCloudinaryPublicId("https://example.com/image/upload/v1/a.jpg"), null);
});

test("duplicate slugs and invalid Cloudinary URLs are skipped with exact issues", async () => {
  const duplicate = await planImport([valid(), valid()], repository());
  assert.deepEqual(duplicate.duplicates, ["tshirt-oversized"]);
  assert.ok(duplicate.plans.every((plan) => plan.action === "SKIP"));
  const invalid = await planImport([valid({ colors: [{ id: "noir", name: "Noir", hex: "#111111", images: ["https://example.com/a.jpg"] }] })], repository());
  assert.match(invalid.plans[0].issues.join(" "), /invalid HTTPS Cloudinary URL/);
});

test("existing Product receives a narrow patch while unrelated fields and referenced color ID remain intact", async () => {
  const existing = { id: "p1", slug: "tshirt-oversized", colors: [{ id: "color-1", name: "Noir", hex: "#111111" }], images: [], featured: true, sizeGuideEnabled: true, createdAt: "old", customMetadata: "keep" };
  const repo = repository([existing]); repo.getReferencedColorIds = async () => ["color-1"];
  const report = await planImport([valid()], repo); const plan = report.plans[0];
  assert.equal(plan.action, "UPDATE"); assert.equal(plan.patch.colors[0].id, "color-1");
  for (const key of ["featured", "sizeGuideEnabled", "createdAt", "customMetadata", "status"]) assert.equal(Object.hasOwn(plan.patch, key), false);
  assert.ok(plan.patch.images.every((image) => image.colorId === "color-1"));
});

test("removing a referenced existing color is refused", async () => {
  const existing = { id: "p1", slug: "tshirt-oversized", colors: [{ id: "color-1", name: "Legacy Red", hex: "#FF0000" }], images: [] };
  const repo = repository([existing]); repo.getReferencedColorIds = async () => ["color-1"];
  const report = await planImport([valid()], repo);
  assert.equal(report.plans[0].action, "SKIP"); assert.match(report.plans[0].issues[0], /referenced existing color id/);
});

test("new Products use canonical defaults and remain draft", () => {
  const created = canonicalCreate(valid()); assert.equal(created.status, "draft"); assert.equal(created.featured, false); assert.equal(created.showInDrop001, false);
});

test("dry run makes zero writes and write mode touches Products only", async () => {
  const repo = repository(); const report = await planImport([valid()], repo);
  assert.equal(await executePlan(report, repo), 0); assert.deepEqual(repo.writes, []);
  assert.equal(await executePlan(report, repo, true), 1); assert.equal(repo.writes[0][0], "products:create");
  assert.ok(repo.writes.every(([operation]) => !/orders|favorites|looks|users|wishlist/i.test(operation)));
});

test("privacy regression: direct Product reads are admin-only and storefront projection omits cost", async () => {
  const [rules, storefront, looks] = await Promise.all([readFile("firestore.rules", "utf8"), readFile("lib/firestore/products.ts", "utf8"), readFile("lib/firestore/looks.ts", "utf8")]);
  const productRule = rules.match(/match \/products\/\{productId\} \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.match(productRule, /allow read: if isAdmin\(\)/); assert.doesNotMatch(productRule, /status == "active"/);
  const parser = storefront.match(/function parseProduct[\s\S]*?\n\}/)?.[0] ?? "";
  assert.doesNotMatch(parser, /costPriceDzd/);
  const lookRule = rules.match(/match \/looks\/\{lookId\} \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  assert.match(lookRule, /allow read: if isAdmin\(\)/); assert.doesNotMatch(looks.match(/function parseLook[\s\S]*?\n\}/)?.[0] ?? "", /costPriceDzd/);
});
