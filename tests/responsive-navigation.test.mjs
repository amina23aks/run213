import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const header = await readFile("components/layout/Header.tsx", "utf8");
const hero = await readFile("components/home/Hero.tsx", "utf8");
const adminShell = await readFile("components/admin/AdminShell.tsx", "utf8");
const adminLayout = await readFile("app/admin/layout.tsx", "utf8");
const css = await readFile("app/globals.css", "utf8");

test("desktop public navigation hides the hamburger at the 760px breakpoint", () => {
  assert.match(css, /@media \(min-width: 760px\)[\s\S]*?\.site-header__nav \{ display: flex; \}/);
  assert.match(css, /@media \(min-width: 760px\)[\s\S]*?\.site-header__menu \{ display: none !important; \}/);
});

test("mobile header uses a custom accessible menu with every expected route", () => {
  assert.match(css, /@media \(max-width: 759px\)/);
  assert.match(header, /aria-expanded=\{isMenuOpen\}/);
  assert.match(header, /aria-controls="mobile-navigation"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /mobile-nav__backdrop/);
  for (const route of ["/", "/shop", "/orders", "/run-club"]) assert.match(header, new RegExp(`href: "${route.replaceAll("/", "\\/")}"`));
});

test("mobile navigation closes on route changes and link selection", () => {
  assert.match(header, /\[pathname\]/);
  assert.match(header, /onClick=\{\(\) => setIsMenuOpen\(false\)\}/);
  assert.match(header, /document\.body\.style\.overflow = "hidden"/);
});

test("hero primary CTA goes directly to the shop", () => {
  assert.match(hero, /href="\/shop">SHOP NOW/);
  assert.doesNotMatch(hero, /SHOP DROP_001/);
});

test("admin keeps its protected desktop sidebar and enables compact navigation only below 900px", () => {
  assert.match(adminLayout, /<AdminAccessGate>\{children\}<\/AdminAccessGate>/);
  assert.match(adminShell, /<aside className="adminSidebar" aria-label="Admin navigation">/);
  assert.match(adminShell, /aria-expanded=\{isNavOpen\}/);
  assert.match(adminShell, /event\.key === "Escape"/);
  assert.match(css, /\.adminSidebar__toggle[\s\S]*?display: none/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.adminSidebar__toggle[\s\S]*?display: inline-flex/);
});
