import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const checkout = await readFile("components/checkout/CheckoutForm.tsx", "utf8");
const client = await readFile("lib/orders/client.ts", "utf8");
const orderDetail = await readFile("components/orders/CustomerOrderDetailClient.tsx", "utf8");
const styles = await readFile("app/globals.css", "utf8");

function visibleCheckoutErrors(errors) {
  return ["fullName", "phone", "wilaya", "address", "deliveryMode", "notes"].filter((field) => errors[field]);
}
function correct(errors, field) { const next = { ...errors }; delete next[field === "deliveryType" ? "deliveryMode" : field]; return next; }
function mapServerErrors(errors) { return Object.fromEntries(Object.entries(errors).map(([path, message]) => [path.split(".").at(-1), message])); }

test("invalid Checkout phone renders directly under Phone", () => { assert.match(checkout, /name="phone"[\s\S]*?fieldErrors\.phone[\s\S]*?className="fieldError"/); });
test("invalid Checkout name renders directly under Full name", () => { assert.match(checkout, /name="fullName"[\s\S]*?fieldErrors\.fullName[\s\S]*?className="fieldError"/); });
test("invalid Wilaya and address map to their own feedback", () => { assert.match(checkout, /name="wilaya"[\s\S]*?fieldErrors\.wilaya/); assert.match(checkout, /name="address"[\s\S]*?fieldErrors\.address/); });
test("multiple invalid fields render independently", () => assert.deepEqual(visibleCheckoutErrors({ fullName: "Name", phone: "Phone", wilaya: "Wilaya" }), ["fullName", "phone", "wilaya"]));
test("correcting one field clears only its stale error", () => assert.deepEqual(correct({ phone: "Phone", address: "Address" }, "phone"), { address: "Address" }));
test("successful validation clears all field errors", () => { assert.match(checkout, /setFieldErrors\(\{\}\)/); assert.match(checkout, /const order = await submitOrderToApi/); });
test("structured nested server fieldErrors map to Checkout fields", () => { assert.deepEqual(mapServerErrors({ "customer.phone": "Phone", "delivery.wilaya": "Wilaya" }), { phone: "Phone", wilaya: "Wilaya" }); assert.match(client, /path\.split\("\."\)\.at\(-1\)/); });
test("generic server failure keeps generic message UI without field duplication", () => { assert.match(checkout, /else setMessage\(error instanceof Error/); assert.match(checkout, /Object\.keys\(error\.fieldErrors\)\.length/); });
test("Checkout reuses canonical shared delivery schema without React regexes", () => { assert.match(client, /customerDeliveryEditSchema\.safeParse\(values\)/); assert.doesNotMatch(checkout, /\^\(\?:\\\+213|\\d\{8\}/); });
test("invalid states use compact RUN213 red feedback", () => { assert.match(styles, /\.deliveryValidationSummary/); assert.match(styles, /\.fieldError, \.orderFieldError/); assert.match(styles, /\[aria-invalid="true"\]/); });
test("Order Edit summary is inside Delivery Details form, never the page header notice", () => { const form = orderDetail.indexOf('<form className="orderEditForm"'); const summary = orderDetail.indexOf('formError?<p className="deliveryValidationSummary"'); const header = orderDetail.indexOf('<header className="orderDetailHeader'); assert.ok(header < form); assert.ok(summary > form); const pageNotice = orderDetail.slice(orderDetail.indexOf("return <section"), header); assert.doesNotMatch(pageNotice, /formError|Check the highlighted delivery details/); });
test("Order Edit field errors remain beneath corresponding fields", () => { for (const field of ["fullName", "phone", "wilaya", "address", "deliveryMode", "notes"]) assert.match(orderDetail, new RegExp(`fieldErrors\\.${field}.*orderFieldError`)); });
