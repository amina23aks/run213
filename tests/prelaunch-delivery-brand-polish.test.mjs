import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(path, "utf8");

test("order contribution is display-only and preserves the historical snapshot", async () => {
  const detail = await read("components/admin/orders/AdminOrderDetailClient.tsx");
  assert.match(detail, /Estimated profit before return costs/);
  assert.match(detail, /Estimated contribution after return/);
  assert.match(detail, /estimatedProfitDzd - returnCostDzd/);
  assert.match(detail, /returnCostDzd == null \? \[\]/);
  assert.doesNotMatch(detail, /setOrder\([^)]*estimatedProfitDzd/);
});

test("native product color picker remains while companion values normalize safely", async () => {
  const color = await read("lib/products/color.ts");
  assert.match(color, /#\?\(\[0-9a-f\]\{6\}\)/);
  assert.match(color, /rgb\\\(/);
  assert.match(color, /channel > 255/);
  assert.match(color, /toUpperCase/);
  const row = await read("components/admin/products/AdminProductColorRow.tsx");
  assert.match(row, /type="color"/);
  assert.match(row, /normalizeProductColor/);
  assert.match(row, /rgbChannelsToProductColor/);
  assert.match(row, /RGB values must be 0–255/);
});

test("image mapping retains canonical color ids and presents names with swatches", async () => {
  const preview = await read("components/admin/products/AdminProductImagePreview.tsx");
  assert.match(preview, /value=\{color\.id\}/);
  assert.match(preview, /colorId: event\.target\.value/);
  assert.match(preview, /backgroundColor: color\.hex/);
  assert.match(preview, /color\.name/);
});

test("both checkout surfaces present rates from the canonical shipping module", async () => {
  const modes = await read("components/checkout/DeliveryModeOptions.tsx");
  const shipping = await read("lib/orders/shipping.ts");
  assert.match(modes, /getDeliveryModeRates/);
  assert.match(modes, /rates\.homeDzd/);
  assert.match(modes, /rates\.deskDzd/);
  assert.match(shipping, /ECONOMIC_SHIPPING_RATES/);
  for (const path of ["components/checkout/CheckoutForm.tsx", "components/cart/CartDrawer.tsx"]) assert.match(await read(path), /<DeliveryModeOptions/);
});

test("Look Detail remains stacked and collection preview alone owns its overflow cue", async () => {
  const look = await read("components/look/LookDetailClient.tsx");
  const strip = await read("components/look/LookMiniProductStrip.tsx");
  assert.match(look, /className="lookItemsList"/);
  assert.doesNotMatch(look, /lookStripArrow|scrollProducts/);
  assert.match(strip, /Show more included products/);
  assert.match(strip, /scrollWidth/);
  assert.match(strip, /canScrollNext \?/);
  assert.match(strip, /querySelector<HTMLElement>\("\.lookMiniProduct"\)/);
});

test("manifest remains safe without claiming unavailable square icon assets", async () => {
  const manifest = await read("app/manifest.ts");
  const layout = await read("app/layout.tsx");
  assert.match(manifest, /name: "213 RUN"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(layout, /icon: "\/brand\/favicon\.png"/);
  assert.doesNotMatch(`${manifest}\n${layout}`, /app-icon-(?:180|192|512)\.png/);
  assert.doesNotMatch(manifest, /sizes: "(?:180|192|512)x(?:180|192|512)"/);
});
