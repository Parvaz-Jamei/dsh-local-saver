import { test } from "node:test";
import assert from "node:assert/strict";
import { compressToolText } from "../rtk/compress.js";
import { shrink, resetCache } from "../saver-core.js";

function row(name, raw, out, extra = "") {
  const before = raw.length;
  const after = out.length;
  const pct = before ? (((before - after) / before) * 100).toFixed(1) : "0.0";
  return `${name.padEnd(18)} ${String(before).padStart(8)} -> ${String(after).padStart(8)}  ${pct}% ${extra}`;
}

test("benchmark sample fixtures (lossy; not quality-neutral)", () => {
  resetCache();
  const fixtures = {
    grep: Array.from({ length: 30 }, (_, i) => `/app/src/a.js:${i}: hit ${i}`).join("\n"),
    npm: ["npm warn deprecated a@1", "npm warn deprecated b@1", ...Array.from({ length: 40 }, (_, i) => `Compiling pkg_${i}`), "added 12 packages"].join("\n"),
    pytest: ["===== test session starts =====", "test_ok PASSED", "test_bad FAILED", "E   AssertionError: boom", "===== 1 failed, 1 passed in 0.12s ====="].join("\n"),
  };
  const lines = ["fixture            before       after   cut"];
  for (const [name, raw] of Object.entries(fixtures)) {
    const padded = raw.length >= 520 ? raw : raw + "\n" + "x".repeat(520 - raw.length);
    const c = compressToolText(padded, 3);
    lines.push(row(name, padded, c.text, c.filter || ""));
    assert.ok(c.text.length <= padded.length);
  }
  const src = "int x;\n".repeat(400);
  const s = shrink("read_file", src, { enabled: true, level: 3, mode: "coding-safe", scope: "bench" });
  lines.push(row("source-safe", src, String(s.value), s.filter || ""));
  assert.match(String(s.value), /int x;/);
  console.log(lines.join("\n"));
});
