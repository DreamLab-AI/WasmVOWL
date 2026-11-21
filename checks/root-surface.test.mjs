// Guards the root build surface of the repository (W4COVC-F4, F5, F6).
// Run with: node --test checks/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));

test("F4: no root script calls grunt without an existing Gruntfile", () => {
  assert.equal(existsSync(resolve(root, "Gruntfile.js")), false, "root Gruntfile unexpectedly exists; revisit this test");
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    if (!/\bgrunt\b/.test(cmd)) continue;
    const m = cmd.match(/--gruntfile\s+(\S+)/);
    assert.ok(m, `script "${name}" runs grunt with no --gruntfile and the root has no Gruntfile: ${cmd}`);
    assert.ok(existsSync(resolve(root, m[1])), `script "${name}" points at missing ${m[1]}`);
  }
});

test("F4: install does not trigger a legacy build", () => {
  assert.equal(pkg.scripts.postinstall, undefined);
});

test("F4: root test script runs the modern suite", () => {
  assert.match(pkg.scripts.test, /modern/);
});

test("F5: the retired WebVOWL Docker image is not shipped", () => {
  // The image ran upstream WebVOWL on an end-of-life Tomcat base, not this
  // repository's code; it was retired on 2026-11-21.
  assert.ok(!existsSync(resolve(root, "Dockerfile")), "Dockerfile is back");
  assert.ok(!existsSync(resolve(root, "docker-compose.yml")), "docker-compose.yml is back");
});

test("F6: tests/README.md only documents npm scripts that exist", () => {
  const readme = read("tests/README.md");
  for (const m of readme.matchAll(/npm run ([\w:-]+)/g)) {
    assert.ok(pkg.scripts[m[1]], `tests/README.md documents missing script "${m[1]}"`);
  }
  if (!existsSync(resolve(root, "src"))) {
    assert.match(readme, /not wired|orphan|not runnable/i, "README must say the suite is not runnable while src/ is absent");
  }
});
