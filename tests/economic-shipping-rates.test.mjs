import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wilayaSource = await readFile("data/algeriaWilayas.ts", "utf8");
const shippingSource = await readFile("lib/orders/shipping.ts", "utf8");
const rates = JSON.parse(await readFile("data/economicShippingRates.json", "utf8"));
const wilayas = [...wilayaSource.matchAll(/\{ code: "(\d{2})", name: "([^"]+)" \}/g)].map((match) => ({ code: match[1], name: match[2] }));
const byCode = new Map(rates.map((rate) => [rate.code, rate]));
const byName = new Map(wilayas.map((wilaya) => [wilaya.name, byCode.get(wilaya.code)]));

test("all 58 canonical Wilayas have exactly one explicit economic rate", () => {
  assert.equal(wilayas.length, 58);
  assert.equal(rates.length, 58);
  assert.equal(byCode.size, 58, "duplicate Wilaya rate code");
  assert.deepEqual([...byCode.keys()].sort(), wilayas.map((wilaya) => wilaya.code).sort());
  for (const wilaya of wilayas) assert.ok(byCode.has(wilaya.code), `missing ${wilaya.code} ${wilaya.name}`);
});

test("representative merchant rates are exact", () => {
  const expected = {
    Alger: [400, 400], Tipaza: [600, 400], Blida: [600, 400], "Tizi Ouzou": [700, 400],
    Ghardaïa: [850, 550], Touggourt: [900, 500], Timimoun: [1300, 850], Adrar: [1350, 900],
    Djanet: [1500, 1250], Tamanrasset: [1550, 1300],
  };
  for (const [name, [homeDzd, deskDzd]] of Object.entries(expected)) assert.deepEqual(byName.get(name), { code: wilayas.find((wilaya) => wilaya.name === name)?.code, homeDzd, deskDzd });
});

test("current RUN213 spellings resolve by stable code", () => {
  assert.deepEqual(byName.get("Bordj Bou Arréridj"), { code: "34", homeDzd: 700, deskDzd: 400 });
  assert.deepEqual(byName.get("El Meniaa"), { code: "58", homeDzd: 900, deskDzd: 500 });
});

test("shipping has no zone, generated, 450, or 350 fallback and fails unsupported Wilayas", () => {
  assert.doesNotMatch(shippingSource, /const zone|450|350|Math\.max/);
  assert.match(shippingSource, /if \(!rate\) throw new Error/);
  assert.match(shippingSource, /if \(!rate\) throw new Error\("Unsupported wilaya"\)/);
});

test("checkout, Quick Checkout, order creation, and delivery edits share getShippingQuote", async () => {
  const [summary, drawer, createOrder, customer] = await Promise.all([
    readFile("components/checkout/CheckoutSummary.tsx", "utf8"), readFile("components/cart/CartDrawer.tsx", "utf8"),
    readFile("lib/orders/createOrder.ts", "utf8"), readFile("lib/orders/customer.ts", "utf8"),
  ]);
  assert.match(summary, /getShippingQuote/);
  assert.match(drawer, /getShippingQuote/);
  assert.match(createOrder, /shippingCalculator\.quote/);
  assert.match(createOrder, /totalDzd: itemsSubtotalDzd \+ shippingDzd/);
  assert.match(customer, /shippingCalculator\.quote/);
  assert.match(customer, /totalDzd: itemsSubtotalDzd \+ quote\.amountDzd/);
});
