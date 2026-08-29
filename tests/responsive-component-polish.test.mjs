import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("related products keep two compact columns on narrow screens", () => {
  const css = read("app/globals.css");
  assert.match(css, /@media \(max-width: 559px\)[\s\S]*?\.relatedProducts__grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("account uses explicit light and dark icon assets and puts sign out last", () => {
  const account = read("components/account/AccountPageClient.tsx");
  for (const name of ["order-bag", "heart", "running"]) {
    assert.ok(account.includes(`lightIcon=\"/icons/${name}.png\"`));
    assert.ok(account.includes(`darkIcon=\"/icons/${name}-dark.png\"`));
  }
  assert.ok(account.indexOf("accountSignout") > account.indexOf("ACCOUNT ACTIVITY"));
  assert.doesNotMatch(account, /replace\(\/\\\.png\$\//);
});

test("admin view store is the final navigation item without an external glyph", () => {
  const shell = read("components/admin/AdminShell.tsx");
  assert.match(shell, /\{ label: "Wishlist"[\s\S]*?\{ label: "View Store", href: "\/" \}/);
  assert.doesNotMatch(shell, /Settings|\/admin\/settings/);
  assert.doesNotMatch(shell, /↗|external-link/i);
  assert.doesNotMatch(shell, /adminSidebar__store/);
});

test("closed mobile admin navigation does not reserve drawer height", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.adminSidebar__nav\s*\{\s*display:\s*none/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.adminSidebar\s*\{\s*min-height:\s*0/);
});

test("run club detail uses compact definition rows and safe image fallback", () => {
  const css = read("app/globals.css");
  const admin = read("components/admin/AdminRunClubClient.tsx");
  assert.match(css, /\.adminRunClubInfo dl\s*\{\s*grid-template-columns:\s*6\.5rem minmax\(0, 1fr\)/);
  assert.ok(admin.includes('fallbackSrc="/placeholders/community-proof-placeholder.webp"'));
  assert.match(admin, /mailto:/);
});

test("product and account media replace broken images with intentional placeholders", () => {
  assert.ok(read("components/home/ProductCard.tsx").includes('fallbackSrc="/placeholders/product-placeholder.webp"'));
  assert.ok(read("components/account/AccountPageClient.tsx").includes('fallbackSrc="/placeholders/community-proof-placeholder.webp"'));
  assert.match(read("components/ui/FallbackImage.tsx"), /onError/);
});

test("footer copyright exists once and follows the legal links", () => {
  const footer = read("components/layout/Footer.tsx");
  assert.equal(footer.match(/© 2026 213 RUN\. All rights reserved\./g)?.length, 1);
  assert.ok(footer.indexOf("Privacy Policy") < footer.indexOf("© 2026"));
});
