import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("homepage renders the active collection result dynamically without a fourth slot", async () => {
  const [server, client] = await Promise.all([
    read("components/home/ShopTheLook.tsx"),
    read("components/home/ShopTheLookClient.tsx"),
  ]);
  assert.match(server, /listActiveLookCollections\(\)/);
  assert.match(client, /collections\.map\(\(collection, index\)/);
  assert.match(client, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.doesNotMatch(client, /COLLECTION_SLOTS|look-card--disabled|look-card__placeholder|summer-road|essential-layers/);
});

test("public collection reads exclude draft and archived records and sort deterministically", async () => {
  const source = await read("lib/firestore/looks.ts");
  assert.match(source, /collection\(COLLECTIONS\)\.where\("status", "==", "active"\)/);
  assert.match(source, /a\.sortOrder - b\.sortOrder \|\| a\.id\.localeCompare\(b\.id\)/);
  assert.match(source, /if \(!isString\(data\.slug\) \|\| !isString\(data\.name\) \|\| !isImage\(data\.cardImage\)/);
});

test("collection cards use a responsive count-independent grid", async () => {
  const css = await read("app/globals.css");
  assert.match(css, /\.shopLookCards \{ display: grid; grid-template-columns: repeat\(auto-fit, minmax\(min\(18rem, 100%\), 1fr\)\)/);
  assert.doesNotMatch(css, /flex: 1 1 calc\(\(100% - 3\.375rem\) \/ 4\)/);
});

test("Admin uses unnamed homepage positions and clear empty states", async () => {
  const [collections, looks] = await Promise.all([
    read("components/admin/looks/AdminLookCollectionsClient.tsx"),
    read("components/admin/looks/AdminLooksClient.tsx"),
  ]);
  assert.match(collections, /title="Homepage order"/);
  assert.match(collections, /label="Homepage position"/);
  assert.match(collections, /Controls the display order of active collections on the homepage\./);
  assert.doesNotMatch(collections, /Fixed homepage slot|Summer Road|City Everyday|Evening Layer|Essential Layers/);
  assert.match(collections, /No collections yet\. Create your first collection above\./);
  assert.match(looks, /Create a Look Collection first\./);
  assert.match(looks, /disabled=\{!availableCollections\.length\}/);
  assert.match(looks, /No Looks yet\. Create your first Look above\./);
});

test("Look color selection keys thumbnails by colorId while preserving the editorial hero and cart color", async () => {
  const source = await read("components/look/LookDetailClient.tsx");
  assert.match(source, /product\.images\.find\(\(image\) => image\.colorId === selectedColorId\)/);
  assert.match(source, /colorId: color\.id/);
  assert.match(source, /preparedItems\.push\(\{ product, selectedColorId: state\.colorId,/);
  assert.match(source, /addLookGroup\(/);
  assert.match(source, /src=\{cloudinaryImageUrl\(look\.heroImage\.url/);
  assert.equal(source.match(/src=\{cloudinaryImageUrl\(look\.heroImage\.url/g)?.length, 1);
});
