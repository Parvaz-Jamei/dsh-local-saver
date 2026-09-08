import { test } from "node:test";
import assert from "node:assert/strict";
import { extractText, putText } from "../compress.js";
import {
  shrink,
  resolveToolName,
  contentHash,
  cacheKey,
  cacheScope,
  parseDryRun,
  resetCache,
} from "../saver-core.js";

test("resolveToolName reads payload even when output is a string", () => {
  assert.equal(resolveToolName({ name: "read_file" }, "plain"), "read_file");
  assert.equal(resolveToolName({ toolName: "grep" }, { value: "x" }), "grep");
  assert.equal(resolveToolName({}, { name: "bash" }), "bash");
});

test("cacheKey uses full sha256 not an 8k prefix", () => {
  const a = "N".repeat(9000) + "TAIL-A";
  const b = "N".repeat(9000) + "TAIL-B";
  assert.notEqual(contentHash(a), contentHash(b));
  assert.notEqual(cacheKey("bash", a, "/ws1"), cacheKey("bash", b, "/ws1"));
  assert.notEqual(cacheKey("bash", a, "/ws1"), cacheKey("bash", a, "/ws2"));
});

test("cacheScope prefers session then workspace", () => {
  assert.equal(cacheScope({ DSH_SESSION: "s1", DSH_WORKSPACE: "w1" }), "s1");
  assert.equal(cacheScope({ DSH_WORKSPACE: "w1" }), "w1");
});

test("putText keeps non-text array blocks", () => {
  const v = [
    { type: "image", url: "file://a.png" },
    { type: "text", text: "hello world ".repeat(60) },
  ];
  const out = putText(v, "compressed");
  assert.equal(out[0].url, "file://a.png");
  assert.equal(out[1].text, "compressed");
});

test("putText does not wipe stderr", () => {
  const out = putText({ stdout: "o", stderr: "boom" }, "c");
  assert.equal(out.stderr, "boom");
  assert.equal(out.stdout, "c");
});

test("extractText handles result and message envelopes", () => {
  assert.equal(extractText({ result: "abc" }), "abc");
  assert.equal(extractText({ message: "zzz" }), "zzz");
  assert.equal(extractText({ content: [{ type: "image" }] }), null);
});

test("same-prefix different tail is not treated as repeat", () => {
  resetCache();
  const head = "line\n".repeat(200);
  const a = shrink("bash", head + "AAA-UNIQUE", { enabled: true, level: 3, mode: "balanced", scope: "t1" });
  const b = shrink("bash", head + "BBB-UNIQUE", { enabled: true, level: 3, mode: "balanced", scope: "t1" });
  assert.notEqual(b.filter, "repeat-cache");
  assert.ok(a.filter);
});

test("dry-run reports savings but keeps original value", () => {
  resetCache();
  const raw = ("npm warn deprecated foo\n").repeat(40) + "added 12 packages\n";
  const out = shrink("bash", raw, { enabled: true, level: 3, mode: "aggressive", dryRun: true, scope: "dry" });
  assert.equal(out.value, raw);
  assert.match(String(out.filter), /dry-run/);
});

test("parseDryRun reads env", () => {
  assert.equal(parseDryRun({}), false);
  assert.equal(parseDryRun({ DSH_LOCAL_SAVER_DRY_RUN: "1" }), true);
});

test("keepErrors survive after cap on huge gcc log", () => {
  resetCache();
  const lines = Array.from({ length: 2000 }, (_, i) => `Compiling f${i}.c`);
  lines.push("src/main.c:9: error: expected ';' before 'return'");
  lines.push("make: *** [main.o] Error 1");
  const raw = lines.join("\n");
  const out = shrink("bash", raw, { enabled: true, level: 3, mode: "balanced", scope: "cap" });
  assert.match(String(out.value), /expected ';' before 'return'/);
  assert.ok(String(out.value).length < raw.length);
});
