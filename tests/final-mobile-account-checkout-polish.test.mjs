import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const account = readFileSync("components/account/AccountPageClient.tsx", "utf8");
const checkout = readFileSync("app/checkout/page.tsx", "utf8");
const summary = readFileSync("components/checkout/CheckoutSummary.tsx", "utf8");
const hero = readFileSync("components/home/Hero.tsx", "utf8");
const looks = readFileSync("components/home/ShopTheLookClient.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

 test("Account Activity contains only Orders, Favorites, and Run Club", () => {
  const activity = account.match(/<nav className="accountActivity">([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assert.deepEqual([...activity.matchAll(/label="([^"]+)"/g)].map((match) => match[1]), ["MY ORDERS", "FAVORITES", "RUN CLUB"]);
  assert.doesNotMatch(activity, /label="SAVED"|\/icons\/save/);
});

test("Account icons map to theme rather than viewport or system media", () => {
  for (const icon of ["order-bag", "heart", "running"]) {
    assert.match(account, new RegExp(`lightIcon="/icons/${icon}\\.png"`));
    assert.match(account, new RegExp(`darkIcon="/icons/${icon}-dark\\.png"`));
  }
  assert.doesNotMatch(account, /prefers-color-scheme|<picture>|media=/);
  assert.match(css, /\[data-theme="dark"\] \.accountActivity__iconLight\{display:none!important\}/);
  assert.match(css, /\[data-theme="dark"\] \.accountActivity__iconDark\{display:block!important\}/);
});

test("Checkout has one summary before the form and keeps canonical totals", () => {
  assert.equal((checkout.match(/<CheckoutSummary \/>/g) ?? []).length, 1);
  assert.ok(checkout.indexOf("<CheckoutSummary />") < checkout.indexOf("<CheckoutForm />"));
  assert.match(css, /\.checkoutForm \{ grid-column: 1; grid-row: 1; \}/);
  assert.match(css, /\.checkoutSummary \{ grid-column: 2; grid-row: 1; \}/);
  assert.match(summary, /subtotalDzd \+ \(deliveryDzd \?\? 0\)/);
  assert.match(summary, /run213:delivery-change/);
});

test("mobile collections stack without altering the figure carousel", () => {
  assert.match(css, /\.shopLookCards \{ display: grid; grid-template-columns: minmax\(0, 1fr\); gap: \.75rem; overflow: visible;/);
  assert.match(looks, /className="figure-row"/);
  assert.match(looks, /className="shopLookCards"/);
});

test("Shop Hero uses the deployable root asset path", () => {
  assert.match(css, /url\("\/shop-hero\.png"\)/);
  assert.doesNotMatch(css, /url\("\/brand\/shop-hero\.png"\)/);
});

test("Shop Hero badge stays compact and copy sits lower with a mobile-safe break", () => {
  assert.match(css, /\.shopHero__eyebrow \{[^}]*align-self: flex-start;/);
  assert.match(css, /\.shopHero > div \{[^}]*justify-content: flex-end;/);
  const shopHero = readFileSync("components/shop/ShopHero.tsx", "utf8");
  assert.match(shopHero, /comfort,<br className="shopHero__desktopBreak" \/> modern fits/);
  assert.match(css, /\.shopHero__desktopBreak \{ display: none; \}/);
});

test("Home Hero preserves CTA labels and destinations while lowering mobile content", () => {
  assert.match(hero, /href="\/shop">SHOP NOW/);
  assert.match(hero, /href="#shop-the-look">EXPLORE LOOKS/);
  assert.match(css, /@media \(max-width: 759px\)[\s\S]*?\.hero__content \{ transform: translateY\(1\.5rem\); \}/);
});
