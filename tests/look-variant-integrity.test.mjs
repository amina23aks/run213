import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("homepage figures are canonical-ID deduped, deterministically ordered, and rendered once", async () => {
  const [store, client] = await Promise.all([
    read("lib/firestore/looks.ts"),
    read("components/home/ShopTheLookClient.tsx"),
  ]);
  assert.match(store, /const uniqueLooks = new Map<string, Look>\(\)/);
  assert.match(store, /!uniqueLooks\.has\(look\.id\)/);
  assert.match(store, /homepageFigureOrder \?\? a\.sortOrder/);
  assert.match(store, /a\.sortOrder - b\.sortOrder[\s\S]*?a\.id\.localeCompare\(b\.id\)/);
  assert.match(client, /new Map\(figures\.map\(\(figure\) => \[figure\.id, figure\]\)\)/);
  assert.match(client, /logicalFigures\.map\(\(figure, originalIndex\)/);
  assert.match(client, /key=\{figure\.id\}/);
  assert.doesNotMatch(client, /\[\.\.\.figures, \.\.\.figures\]|isDuplicate|duplicate" : "original/);
  assert.match(client, /figure\.figureImage \?\? figure\.heroImage/);
});

test("normal Product and Look selection send canonical color IDs into cart", async () => {
  const [productInfo, productCard, look] = await Promise.all([
    read("components/product/ProductInfo.tsx"),
    read("components/home/ProductCard.tsx"),
    read("components/look/LookDetailClient.tsx"),
  ]);
  assert.match(productInfo, /addItem\(\{ product, selectedColorId, selectedSize, quantity \}\)/);
  assert.match(productCard, /addItem\(\{ product: sourceProduct, selectedColorId, selectedSize, quantity: 1 \}\)/);
  assert.match(look, /preparedItems\.push\(\{ product, selectedColorId: state\.colorId, selectedSize: state\.size/);
  assert.match(look, /image\.colorId === selectedColorId/);
});

test("cart snapshots canonical color identity and preserves legacy name-only items", async () => {
  const [cartType, cart] = await Promise.all([read("types/cart.ts"), read("context/cart.tsx")]);
  for (const field of ["selectedColorId", "selectedColor", "selectedColorHex"]) assert.ok(cartType.includes(field));
  assert.match(cart, /input\.product\.colors\.find\(\(color\) => color\.id === input\.selectedColorId\)/);
  assert.match(cart, /selectedColorId: typeof candidate\.selectedColorId === "string"/);
  assert.match(cart, /selectedColorHex: typeof candidate\.selectedColorHex === "string"/);
  assert.match(cart, /input\.selectedColor \? input\.product\.colors\.find\(\(color\) => color\.name === input\.selectedColor\)/);
});

test("checkout sends color ID and server snapshots authoritative canonical color metadata", async () => {
  const [client, schema, server] = await Promise.all([
    read("lib/orders/client.ts"),
    read("lib/orders/validation.ts"),
    read("lib/orders/createOrder.ts"),
  ]);
  assert.match(client, /selectedColorId: item\.selectedColorId \?\? null/);
  assert.match(schema, /selectedColorId: z\.string\(\)/);
  assert.match(server, /product\.colors\.find\(\(color\) => color\.id === selectedColorId\)/);
  assert.match(server, /selectedColorId: selectedColor\?\.id \?\? null/);
  assert.match(server, /selectedColor: selectedColor\?\.name \?\? null/);
  assert.match(server, /selectedColorHex: selectedColor\?\.hex \?\? null/);
  assert.match(server, /product\.sizes\.some\(\(size\) => size\.label === selectedSize\)/);
  assert.doesNotMatch(server, /selectedColorHex:\s*item\./);
});

test("cart, checkout, Account and Admin render stored historical name, hex, and size without Product reads", async () => {
  const [cart, checkout, customerUi, adminUi, customerSerializer, adminSerializer] = await Promise.all([
    read("components/cart/CartVariantDisplay.tsx"),
    read("components/checkout/CheckoutSummary.tsx"),
    read("components/orders/CustomerOrderDetailClient.tsx"),
    read("components/admin/orders/AdminOrderDetailClient.tsx"),
    read("lib/orders/customer.ts"),
    read("lib/orders/admin.ts"),
  ]);
  assert.match(cart, /colorHex \?\? COLOR_HEX_BY_NAME/);
  assert.match(checkout, /selectedColorHex \?\? checkoutColorHex\(selectedColor\)/);
  for (const ui of [customerUi, adminUi]) {
    assert.match(ui, /selectedColorHex\?\?"transparent"|selectedColorHex \?\? "transparent"/);
    assert.match(ui, /item\.selectedColor/);
    assert.match(ui, /item\.selectedSize/);
  }
  assert.match(customerSerializer, /selectedColorId: opt\(item\.selectedColorId\)/);
  assert.match(adminSerializer, /selectedColorId: stringOrNull\(record\.selectedColorId\)/);
  assert.doesNotMatch(customerSerializer.slice(customerSerializer.indexOf("function toCustomerOrder")), /collection\(PRODUCTS\)|productSnap/);
  assert.doesNotMatch(adminSerializer.slice(adminSerializer.indexOf("function toAdminOrder")), /collection\("products"\)|productSnap/);
});

test("Look Collection public Hero renders canonical name and description without subtitle", async () => {
  const page = await read("app/looks/[collectionSlug]/page.tsx");
  assert.match(page, /<h1>\{collection\.name\}<\/h1>/);
  assert.match(page, /collection\.description \? <p>\{collection\.description\}<\/p> : null/);
  assert.doesNotMatch(page, /collection\.subtitle/);
  assert.equal(page.match(/\{collection\.description\}/g)?.length, 1);
});
