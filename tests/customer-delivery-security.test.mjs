import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const wilayas = ["Alger", "Oran"];
const rates = { Alger: { home: 400, desk: 400 }, Oran: { home: 700, desk: 400 } };
const normalizePhone = (value) => value.replace(/[^0-9+]/g, "");
function validate(input) {
  const allowed = ["fullName", "phone", "wilaya", "address", "deliveryMode", "notes"];
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw new Error("UNKNOWN_FIELD");
  if (input.fullName.trim().length < 2 || input.fullName.trim().length > 80) throw new Error("NAME");
  if (!/^(?:\+213|0)[567]\d{8}$/.test(normalizePhone(input.phone)) || input.phone.trim().length > 20) throw new Error("PHONE");
  if (!wilayas.includes(input.wilaya.trim())) throw new Error("WILAYA");
  if (!['home', 'desk'].includes(input.deliveryMode)) throw new Error("MODE");
  if (input.address.trim().length < 5 || input.address.trim().length > 180) throw new Error("ADDRESS");
  return { ...input, fullName: input.fullName.trim(), wilaya: input.wilaya.trim(), address: input.address.trim() };
}
function subtotal(order) {
  if (Number.isSafeInteger(order.totals?.itemsSubtotalDzd) && order.totals.itemsSubtotalDzd >= 0) return order.totals.itemsSubtotalDzd;
  if (!order.items?.length) throw new Error("SUBTOTAL_UNAVAILABLE");
  return order.items.reduce((sum, item) => {
    if (Number.isSafeInteger(item.lineTotalDzd) && item.lineTotalDzd >= 0) return sum + item.lineTotalDzd;
    if (item.lookId || item.lookGroupId || !Number.isSafeInteger(item.unitPriceDzd) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error("SUBTOTAL_UNAVAILABLE");
    return sum + item.unitPriceDzd * item.quantity;
  }, 0);
}
function edit(order, input, viewer) {
  if (viewer.uid ? order.customerUserId !== viewer.uid : order.guestToken !== viewer.token) throw new Error("NOT_FOUND");
  if (order.status !== "pending") throw new Error("NOT_PENDING");
  const patch = validate(input); const merchandise = subtotal(order); const shippingDzd = rates[patch.wilaya][patch.deliveryMode];
  return { ...order, customer: { ...order.customer, fullName: patch.fullName, phone: patch.phone }, delivery: { ...order.delivery, wilaya: patch.wilaya, address: patch.address, deliveryMode: patch.deliveryMode }, totals: { ...order.totals, itemsSubtotalDzd: merchandise, shippingDzd, totalDzd: merchandise + shippingDzd } };
}
const valid = { fullName: "Amina Runner", phone: "0550 00 00 00", wilaya: "Alger", address: "12 Road Street", deliveryMode: "home", notes: "" };
const base = { status: "pending", customerUserId: "u1", guestToken: "guest", customer: {}, delivery: {}, totals: { itemsSubtotalDzd: 5000, shippingDzd: 1, totalDzd: 1 }, items: [{ productId: "tee", unitPriceDzd: 2500, quantity: 2, lineTotalDzd: 5000 }] };

test("valid authenticated pending delivery edit recalculates money", () => { const result = edit(base, valid, { uid: "u1" }); assert.equal(result.totals.shippingDzd, 400); assert.equal(result.totals.totalDzd, 5400); });
test("valid guest-token edit", () => assert.equal(edit({ ...base, customerUserId: null }, valid, { token: "guest" }).delivery.wilaya, "Alger"));
test("cross-account and wrong guest token are rejected", () => { assert.throws(() => edit(base, valid, { uid: "u2" }), /NOT_FOUND/); assert.throws(() => edit({ ...base, customerUserId: null }, valid, { token: "wrong" }), /NOT_FOUND/); });
test("confirmed/non-pending orders are rejected", () => assert.throws(() => edit({ ...base, status: "confirmed" }, valid, { uid: "u1" }), /NOT_PENDING/));
test("name, phone, address, Wilaya, and delivery mode validation", () => { assert.throws(() => validate({ ...valid, fullName: "" }), /NAME/); assert.throws(() => validate({ ...valid, fullName: "x".repeat(81) }), /NAME/); assert.throws(() => validate({ ...valid, phone: "123abc" }), /PHONE/); assert.throws(() => validate({ ...valid, address: "x".repeat(181) }), /ADDRESS/); assert.throws(() => validate({ ...valid, wilaya: "Made Up" }), /WILAYA/); assert.throws(() => validate({ ...valid, deliveryMode: "pickup" }), /MODE/); });
test("browser money and protected fields are rejected", () => { for (const field of ["shippingDzd", "totalDzd", "status", "customerUserId", "items", "paymentStatus"]) assert.throws(() => validate({ ...valid, [field]: 1 }), /UNKNOWN_FIELD/); });
test("Wilaya and mode changes use canonical shipping while merchandise and items stay unchanged", () => { const originalItems = structuredClone(base.items); const byWilaya = edit(base, { ...valid, wilaya: "Oran" }, { uid: "u1" }); const byMode = edit(base, { ...valid, deliveryMode: "desk" }, { uid: "u1" }); assert.deepEqual(byWilaya.items, originalItems); assert.equal(byWilaya.totals.itemsSubtotalDzd, 5000); assert.equal(byWilaya.totals.totalDzd, 5700); assert.equal(byMode.totals.shippingDzd, 400); });
test("legacy subtotal reconstructs only trusted snapshots and otherwise fails safely", () => { assert.equal(subtotal({ totals: {}, items: [{ unitPriceDzd: 2000, quantity: 2 }] }), 4000); assert.equal(subtotal({ totals: {}, items: [{ lineTotalDzd: 3500, lookId: "look" }] }), 3500); assert.throws(() => subtotal({ totals: {}, items: [{ lookId: "look", unitPriceDzd: 2000, quantity: 2 }] }), /SUBTOTAL_UNAVAILABLE/); assert.throws(() => subtotal({ totals: {}, items: [] }), /SUBTOTAL_UNAVAILABLE/); });
test("implementation performs the authorization, subtotal, quote, and update in one transaction callback", async () => { const source = await readFile("lib/orders/customer.ts", "utf8"); const start = source.indexOf("export async function editCustomerDelivery"); const end = source.indexOf("export async function getCustomerOrderItemOptions"); const implementation = source.slice(start, end); assert.match(implementation, /runTransaction/); assert.match(implementation, /authorize\(data, auth, token\)/); assert.match(implementation, /canonicalMerchandiseSubtotal\(data\)/); assert.match(implementation, /shippingCalculator\.quote/); assert.match(implementation, /transaction\.update\(ref,.*totals/s); });
