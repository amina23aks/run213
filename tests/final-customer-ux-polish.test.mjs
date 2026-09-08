import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [drawer, checkout, orderClient, orderValidation, createOrder, adminOrder, adminSerializer, wilayaInput, runForm, runPage, homeRunClub, communityGrid, productCard, collectionPage, css] = await Promise.all([
  read("components/cart/CartDrawer.tsx"), read("components/checkout/CheckoutForm.tsx"), read("lib/orders/client.ts"), read("lib/orders/validation.ts"),
  read("lib/orders/createOrder.ts"),
  read("components/admin/orders/AdminOrderDetailClient.tsx"), read("lib/orders/admin.ts"), read("components/checkout/WilayaInput.tsx"),
  read("components/run-club/RunClubSubmissionForm.tsx"), read("app/run-club/page.tsx"), read("components/home/RunClub.tsx"),
  read("components/community/CommunityGrid.tsx"), read("components/home/ProductCard.tsx"), read("app/looks/[collectionSlug]/page.tsx"), read("app/globals.css"),
]);

test("Quick Checkout mirrors Checkout auth, guest access, idempotency-success, analytics, and order redirect behavior", () => {
  for (const source of [drawer, checkout]) {
    assert.match(source, /await waitForAuthHydration\(\)/);
    assert.match(source, /user \? await user\.getIdToken\(\) : null/);
    assert.match(source, /submitOrderToApi\(buildCreateOrderRequest\(values, items\), idToken\)/);
    assert.match(source, /saveGuestOrderAccess/);
    assert.match(source, /trackPurchaseAfterSuccess\(order, items\)/);
    assert.match(source, /resetCheckoutAttemptKey\(\);[\s\S]*?clearCart\(\);[\s\S]*?\/orders\/\$\{encodeURIComponent\(order\.orderId\)\}\?status=success/);
  }
  assert.doesNotMatch(drawer, /\/checkout\?status=success/);
  assert.match(orderClient, /getCheckoutAttemptKey/);
});

test("Quick Checkout shares field validation and canonical phone and shipping paths", () => {
  assert.match(drawer, /validateOrderFormFields\(values, items\)/);
  assert.match(drawer, /fieldErrors\.phone/);
  assert.match(drawer, /Check the highlighted delivery details\./);
  assert.match(drawer, /focusFirstError/);
  assert.doesNotMatch(drawer, /validateOrderFormValues/);
  assert.match(orderValidation, /Enter a valid Algerian phone number\./);
  for (const source of [drawer, checkout]) assert.match(source, /buildCreateOrderRequest/);
  assert.match(drawer, /getShippingQuote/);
});

test("Look allocation drives per-line snapshots and historical admin presentation without changing order totals", () => {
  assert.match(createOrder, /allocatedRevenueDzd/); // allocation remains represented on every Look item
  assert.match(createOrder, /item\.admin = calculateItemAdminSnapshot\([^\n]*item\.allocatedRevenueDzd/);
  assert.match(createOrder, /const itemsSubtotalDzd = items\.reduce\(\(total, item\) => total \+ item\.lineTotalDzd, 0\)/);
  assert.match(adminSerializer, /allocatedRevenueDzd: numberOrNull\(record\.allocatedRevenueDzd\)/);
  assert.match(adminOrder, /item\.allocatedRevenueDzd - item\.lineCostDzd/);
  assert.match(adminOrder, /"Allocated revenue"/);
});

test("empty cart copy and contained community frames preserve the compact surfaces", () => {
  assert.match(drawer, /href="\/shop"[^>]*>GO TO SHOP<\/Link>/);
  assert.match(homeRunClub, /imageFit: "contain" as const/);
  assert.match(runPage, /imageFit: "contain" as const/);
  assert.match(css, /\.communityCard > \.communityImageFrame[\s\S]*?aspect-ratio: 4 \/ 3/);
  assert.match(css, /\.communityImageFrame--contain \.communityImageFrame__image \{ object-fit: contain/);
});

test("community modal is accessible and renders only the public CommunityEntry projection", () => {
  assert.match(communityGrid, /role="dialog" aria-modal="true" aria-labelledby="community-detail-title"/);
  assert.match(communityGrid, /event\.key === "Escape"/);
  assert.match(communityGrid, /event\.target === event\.currentTarget/);
  for (const field of ["name", "city", "caption", "approvedDate", "winnerPlacement"]) assert.match(communityGrid, new RegExp(`selectedEntry\\.${field}`));
  assert.doesNotMatch(communityGrid, /email|phone|customerId|admin/);
});

test("Run Club reuses optional canonical Wilaya input while Checkout keeps its required default", () => {
  assert.match(runForm, /<WilayaInput name="wilaya" required=\{false\}/);
  assert.match(wilayaInput, /required = true/);
  assert.match(wilayaInput, /ALGERIA_WILAYAS/);
  assert.match(checkout, /<WilayaInput name="wilaya"/);
  assert.doesNotMatch(checkout, /<WilayaInput name="wilaya" required=\{false\}/);
});

test("mobile swatches stay selectable in one horizontal row and only module titles become compact", () => {
  assert.match(productCard, /sourceProduct\.colors\.map/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.productCard \.swatchesRow \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto/);
  assert.match(css, /\.swatchesRow::-webkit-scrollbar \{ display: none/);
  assert.match(collectionPage, /<h2 className="lookEditorialTitle">\{look\.name\}<\/h2>/);
  assert.match(css, /\.looksCollectionPage \.lookEditorialContent \.lookEditorialTitle[^}]*white-space: nowrap/);
  assert.doesNotMatch(collectionPage, /lookCollectionHero__overlay[\s\S]{0,120}lookEditorialTitle/);
});
