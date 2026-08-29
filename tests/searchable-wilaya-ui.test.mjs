import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const checkout = await readFile("components/checkout/CheckoutForm.tsx", "utf8");
const drawer = await readFile("components/cart/CartDrawer.tsx", "utf8");
const input = await readFile("components/checkout/WilayaInput.tsx", "utf8");
const css = await readFile("app/globals.css", "utf8");

test("checkout and Quick Checkout share the searchable Wilaya input instead of a native select", () => {
  assert.match(checkout, /<WilayaInput name="wilaya"/);
  assert.match(drawer, /<WilayaInput name="drawerWilaya"/);
  assert.doesNotMatch(checkout, /<select name="wilaya"/);
  assert.doesNotMatch(drawer, /<select name="drawerWilaya"/);
});

test("the shared input uses canonical Algeria Wilayas and invalid text submits an empty canonical value", () => {
  assert.match(input, /ALGERIA_WILAYAS\.find/);
  assert.match(input, /resolveCanonicalWilaya\(value\) \?\? ""/);
  assert.match(input, /<input type="hidden" name=\{name\} value=\{canonicalValue\}/);
  assert.match(input, /<datalist/);
});

test("valid Wilaya and delivery-mode changes both recalculate Quick Checkout shipping", () => {
  assert.match(drawer, /onCanonicalChange=\{updateQuickWilaya\}/);
  assert.match(drawer, /onChange=\{updateQuickDelivery\}/);
  assert.match(drawer, /getShippingQuote\(\{ wilaya, deliveryMode/);
});

test("real radios retain explicit selected and focus-visible card states", () => {
  assert.match(checkout, /type="radio" name="deliveryType"/);
  assert.match(drawer, /type="radio" name="drawerDeliveryMode"/);
  assert.match(css, /label:has\(input:checked\)/);
  assert.match(css, /label:has\(input:focus-visible\)/);
  assert.match(css, /radial-gradient\(circle at center, var\(--lime\)/);
});
