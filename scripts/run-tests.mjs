import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const testDirectory = "tests";
const testFiles = readdirSync(testDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => join(testDirectory, entry.name))
  .sort();

if (testFiles.length === 0) {
  console.error("No .test.mjs files were found in the tests directory.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });

if (result.error) {
  console.error("Unable to start the Node.js test runner.", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
