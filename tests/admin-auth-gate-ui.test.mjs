import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const layout = await readFile("app/admin/layout.tsx", "utf8");
const gate = await readFile("components/admin/AdminAccessGate.tsx", "utf8");
const shell = await readFile("components/admin/AdminShell.tsx", "utf8");

test("the Admin gate wraps every Admin route outside the dashboard shell", () => {
  assert.match(layout, /<AdminAccessGate>\{children\}<\/AdminAccessGate>/);
  assert.doesNotMatch(layout, /AdminShell/);
});

test("auth hydration and signed-out Admin routes never render Admin navigation", () => {
  const loadingBranch = gate.slice(gate.indexOf("if (isChecking || !isAdmin)"), gate.indexOf("return children"));
  assert.match(loadingBranch, /adminAuthState/);
  assert.doesNotMatch(loadingBranch, /AdminShell|adminSidebar|Admin navigation/);
  assert.match(gate, /if \(!nextUser\)[\s\S]*router\.replace\(`\/account\?returnTo=/);
  assert.match(gate, /entryPathname\.startsWith\("\/admin"\) \? entryPathname : "\/admin"/);
});

test("non-admin and revoked sessions fail closed before leaving Admin", () => {
  assert.match(gate, /setIsAdmin\(false\);\s*setIsChecking\(true\)/);
  assert.match(gate, /onIdTokenChanged/);
  assert.match(gate, /getIdToken\(forceRefresh\)/);
  assert.match(gate, /verifiedUidRef\.current !== nextUser\.uid/);
  assert.match(gate, /data\.isAdmin !== true/);
  assert.match(gate, /setIsAdmin\(false\);\s*router\.replace\("\/\?adminAccess=required"\)/);
  assert.match(gate, /verification !== verificationRef\.current/);
});

test("authorized child navigation preserves the layout gate without reverifying for pathname alone", async () => {
  assert.match(gate, /const entryPathnameRef = useRef\(pathname\)/);
  assert.match(gate, /}, \[router\]\);/);
  assert.doesNotMatch(gate, /}, \[pathname, router\]\);/);

  const adminComponents = await collectFiles("components/admin");
  const nestedGates = [];
  for (const file of adminComponents) {
    if (file.endsWith("AdminAccessGate.tsx")) continue;
    const source = await readFile(file, "utf8");
    if (source.includes("AdminAccessGate")) nestedGates.push(file);
  }
  assert.deepEqual(nestedGates, []);
});

test("sidebar and internal placeholder navigation use Next client Links", async () => {
  assert.match(shell, /import Link from "next\/link"/);
  assert.match(shell, /<Link className=.*adminSidebar__item/);
  for (const file of ["app/admin/page.tsx", "components/admin/AdminPlaceholderPage.tsx"]) {
    const source = await readFile(file, "utf8");
    assert.match(source, /import Link from "next\/link"/);
    assert.doesNotMatch(source, /<a[^>]+href="\/admin/);
  }
});

test("protected API denial invalidates the mounted gate immediately", () => {
  assert.match(gate, /run213:admin-auth-invalid/);
  assert.match(gate, /verificationRef\.current \+= 1/);
  assert.match(gate, /setIsAdmin\(false\)/);
});

test("only a successful admin:true verification reveals the requested deep link", () => {
  assert.match(gate, /setIsAdmin\(true\);\s*setIsChecking\(false\)/);
  assert.match(gate, /return children/);
  assert.doesNotMatch(shell, /AdminAccess required/);
});

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  }))).flat();
}
