import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  assert.match(gate, /pathname\.startsWith\("\/admin"\) \? pathname : "\/admin"/);
});

test("non-admin and revoked sessions fail closed before leaving Admin", () => {
  assert.match(gate, /setIsAdmin\(false\);\s*setIsChecking\(true\)/);
  assert.match(gate, /getIdToken\(true\)/);
  assert.match(gate, /data\.isAdmin !== true/);
  assert.match(gate, /setIsAdmin\(false\);\s*router\.replace\("\/\?adminAccess=required"\)/);
  assert.match(gate, /verification !== verificationRef\.current/);
});

test("only a successful admin:true verification reveals the requested deep link", () => {
  assert.match(gate, /setIsAdmin\(true\);\s*setIsChecking\(false\)/);
  assert.match(gate, /return children/);
  assert.doesNotMatch(shell, /AdminAccess required/);
});
