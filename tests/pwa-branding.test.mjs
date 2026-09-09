import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const manifestSource = fs.readFileSync("app/manifest.ts", "utf8");
const layoutSource = fs.readFileSync("app/layout.tsx", "utf8");
const packageSource = fs.readFileSync("package.json", "utf8");
const nextConfigSource = fs.readFileSync("next.config.ts", "utf8");
const metadataSource = `${manifestSource}\n${layoutSource}`;

test("manifest uses the canonical RUN213 install identity and navigation mode", () => {
  assert.match(manifestSource, /name:\s*["']213 RUN["']/);
  assert.match(manifestSource, /short_name:\s*["']213 RUN["']/);
  assert.match(manifestSource, /start_url:\s*["']\/["']/);
  assert.match(manifestSource, /scope:\s*["']\/["']/);
  assert.match(manifestSource, /display:\s*["']standalone["']/);
});

test("manifest declares only the truthful install icon sizes", () => {
  assert.match(
    manifestSource,
    /src:\s*["']\/brand\/icon-192\.png["'][\s\S]*?sizes:\s*["']192x192["'][\s\S]*?type:\s*["']image\/png["']/,
  );
  assert.match(
    manifestSource,
    /src:\s*["']\/brand\/icon-512\.png["'][\s\S]*?sizes:\s*["']512x512["'][\s\S]*?type:\s*["']image\/png["']/,
  );
  assert.deepEqual([...manifestSource.matchAll(/sizes:\s*["']([^"']+)["']/g)].map((match) => match[1]), ["192x192", "512x512"]);
});

test("root metadata preserves the favicon and adds Apple home-screen branding", () => {
  assert.match(layoutSource, /manifest:\s*["']\/manifest\.webmanifest["']/);
  assert.match(layoutSource, /icon:\s*["']\/brand\/favicon\.png["']/);
  assert.match(layoutSource, /shortcut:\s*["']\/brand\/favicon\.png["']/);
  assert.match(layoutSource, /apple:\s*["']\/brand\/apple-touch-icon\.png["']/);
  assert.match(layoutSource, /appleWebApp:\s*\{\s*capable:\s*true,\s*title:\s*["']213 RUN["']/);
});

test("metadata has no Vercel branding and configuration adds no PWA runtime", () => {
  assert.doesNotMatch(metadataSource, /vercel/i);
  assert.doesNotMatch(packageSource, /next-pwa|workbox|service.?worker/i);
  assert.doesNotMatch(nextConfigSource, /next-pwa|workbox|service.?worker/i);
  assert.equal(fs.existsSync("public/sw.js"), false);
  assert.equal(fs.existsSync("app/sw.js"), false);
  assert.equal(fs.existsSync("app/service-worker.js"), false);
});
