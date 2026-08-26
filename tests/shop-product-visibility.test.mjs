import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const productSource = read("lib/firestore/products.ts");
const shopPageSource = read("app/shop/page.tsx");
const shopBrowserSource = read("components/shop/ShopBrowser.tsx");
const shopConstantsSource = read("constants/shop.ts");

function publicProjection(product) {
  if (product.status !== "active") return null;
  const publicProduct = { ...product };
  delete publicProduct.costPriceDzd;
  return publicProduct;
}

function retrieveShopCatalog(products, limit = 48) {
  return products
    .map(publicProjection)
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .slice(0, limit);
}

const activeProducts = Array.from({ length: 14 }, (_, index) => ({
  id: `product-${index + 1}`,
  slug: `product-${index + 1}`,
  name: `Product ${String(index + 1).padStart(2, "0")}`,
  category: "tshirts",
  status: "active",
  sortOrder: (index + 1) * 10,
  costPriceDzd: 1_000 + index,
}));

activeProducts[11] = { ...activeProducts[11], slug: "high-neck-zipshirt-regular", name: "High Neck ZipShirt Regular", category: "tops" };
activeProducts[12] = { ...activeProducts[12], slug: "hoodie-regular", name: "Hoodie Regular", category: "hoodies" };
activeProducts[13] = { ...activeProducts[13], slug: "hoodie-oversized", name: "Hoodie Oversized", category: "hoodies" };

test("the public Shop requests the shared bounded 48-product catalog", () => {
  assert.match(productSource, /export const SHOP_CATALOG_LIMIT = 48/);
  assert.match(productSource, /const ACTIVE_PRODUCT_READ_LIMIT = SHOP_CATALOG_LIMIT/);
  assert.match(productSource, /\.where\("status", "==", "active"\)\s*\.limit\(limit\)/s);
  assert.match(shopPageSource, /listActiveProducts\(SHOP_CATALOG_LIMIT\)/);
  assert.doesNotMatch(shopPageSource, /listActiveProducts\(\)/);
});

test("a 14-product active catalog includes products 13 and 14 in canonical order", () => {
  const catalog = retrieveShopCatalog([...activeProducts].reverse());

  assert.equal(catalog.length, 14);
  assert.deepEqual(catalog.slice(-3).map(({ sortOrder, slug }) => [sortOrder, slug]), [
    [120, "high-neck-zipshirt-regular"],
    [130, "hoodie-regular"],
    [140, "hoodie-oversized"],
  ]);
});

test("Hoodies and Tops filters retain the imported category IDs", () => {
  const catalog = retrieveShopCatalog(activeProducts);
  assert.deepEqual(catalog.filter((product) => product.category === "hoodies").map((product) => product.slug), ["hoodie-regular", "hoodie-oversized"]);
  assert.deepEqual(catalog.filter((product) => product.category === "tops").map((product) => product.slug), ["high-neck-zipshirt-regular"]);
  assert.match(shopConstantsSource, /\{ label: "TOPS", value: "tops" \}/);
  assert.match(shopConstantsSource, /\{ label: "HOODIES", value: "hoodies" \}/);
  assert.match(shopBrowserSource, /product\.category === selectedCategory/);
});

test("non-active products and private cost are excluded from the public result", () => {
  const catalog = retrieveShopCatalog([
    ...activeProducts,
    { ...activeProducts[0], id: "draft", status: "draft", sortOrder: 150 },
    { ...activeProducts[0], id: "archived", status: "archived", sortOrder: 160 },
  ]);

  assert.equal(catalog.length, 14);
  assert.ok(catalog.every((product) => !("costPriceDzd" in product)));
  assert.match(productSource, /data\.status !== "active"/);
  assert.doesNotMatch(productSource.slice(productSource.indexOf("function parseProduct"), productSource.indexOf("function isInStock")), /costPriceDzd/);
});
