import { test } from "node:test";
import assert from "node:assert/strict";
import { autoDetectFilter } from "../rtk/autodetect.js";
import { compressToolText } from "../rtk/compress.js";
import { testRunner } from "../rtk/filters/testRunner.js";
import { jsonCompact } from "../rtk/filters/jsonCompact.js";
import { tableCols } from "../rtk/filters/tableCols.js";

function pad(s, n = 520) {
  return s.length >= n ? s : s + "\n" + "x".repeat(n - s.length);
}

test("pytest failures stay, passes drop", () => {
  const raw = pad(
    "===== test session starts =====\n" +
      "test_a.py::test_ok PASSED\n" +
      "test_b.py::test_bad FAILED\n" +
      "E   AssertionError: boom\n" +
      "===== 1 failed, 1 passed in 0.12s =====\n",
  );
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "test-runner");
  const out = testRunner(raw);
  assert.match(out, /FAILED/);
  assert.match(out, /AssertionError/);
  assert.doesNotMatch(out, /test_ok PASSED/);
});

test("json compact caps depth", () => {
  const obj = { a: 1, nest: { b: 2, c: { d: 3, e: { f: 4, g: { h: 5 } } } } };
  const raw = pad(JSON.stringify(obj));
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "json-compact");
  const out = jsonCompact(JSON.stringify(obj));
  assert.ok(out.includes("...") || out.length <= JSON.stringify(obj).length);
});

test("docker ps keeps name status columns", () => {
  const raw =
    "CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS         PORTS     NAMES\n" +
    "abc123         nginx     \"nginx\"   2d        Up 2 days       80/tcp    web\n" +
    "def456         redis     \"redis\"   1d        Exited (0) 3h            cache\n";
  const out = tableCols(raw);
  assert.match(out, /STATUS/);
  assert.match(out, /NAMES|web/);
});

test("compressToolText hits test-runner on padded pytest log", () => {
  const raw = pad(
    "===== test session starts =====\n" +
      ("ok test_pass\n".repeat(40)) +
      "FAIL: test_wifi_init\n" +
      "AssertionError: gpio\n",
  );
  const out = compressToolText(raw, 3);
  assert.equal(out.filter, "test-runner");
  assert.match(out.text, /FAIL: test_wifi_init/);
});
