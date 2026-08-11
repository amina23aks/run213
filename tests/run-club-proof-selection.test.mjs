import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync("components/run-club/RunClubSubmissionForm.tsx", "utf8");

test("successful submit clears the proof File and preview together", () => {
  assert.match(form, /setFields\(initialFields\); commitProofSelection\(emptyProofSelection\); setStatus\("success"\)/);
  assert.match(form, /if \(!nextSelection\.file && fileInputRef\.current\) fileInputRef\.current\.value = ""/);
});

test("remove clears the proof File and preview together", () => {
  assert.match(form, /if \(!nextFile\) \{ commitProofSelection\(emptyProofSelection\); return; \}/);
  assert.match(form, /onClick=\{\(\) => selectFile\(null\)\}>REMOVE/);
});

test("replace commits its File and object URL as one selection", () => {
  assert.match(form, /commitProofSelection\(\{ file: nextFile, preview: URL\.createObjectURL\(nextFile\) \}\)/);
  assert.match(form, /type ProofSelection = \{ file: File; preview: string \} \| \{ file: null; preview: null \}/);
});

test("a stale preview cannot render when the File is null", () => {
  assert.match(form, /proofSelection\.file && proofSelection\.preview \? <Image/);
  assert.doesNotMatch(form, /\{preview \? <Image/);
});
