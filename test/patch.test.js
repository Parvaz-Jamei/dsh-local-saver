import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupLog } from "../rtk/filters/dedupLog.js";
import { compressToolText } from "../rtk/compress.js";
import { putText, extractText } from "../compress.js";
import { parseMode, shrink } from "../saver-core.js";
import { find } from "../rtk/filters/find.js";

test("dedupLog closes paren", () => {
  const lines = Array(8).fill("same line spam").join("\n");
  const out = dedupLog(lines);
  assert.match(out, /duplicate lines\)/);
});

test("oversize input is capped not raw 11MB", () => {
  const huge = "A".repeat(11 * 1024 * 1024);
  const out = compressToolText(huge, 3);
  assert.ok(out.text.length < huge.length);
  assert.ok(out.text.includes("truncated") || out.filter === "raw-cap" || out.saved > 0);
});

test("putText keeps a text field when stdout+stderr present", () => {
  const v = { stdout: "out", stderr: "err" };
  const joined = extractText(v);
  assert.match(joined, /out/);
  assert.match(joined, /err/);
  const back = putText(v, "compressed");
  assert.equal(back.stderr, "");
  assert.equal(back.text, "compressed");
});

test("parseMode public names", () => {
  assert.equal(parseMode({}), "coding-safe");
  assert.equal(parseMode({ DSH_LOCAL_SAVER_MODE: "normal" }), "balanced");
  assert.equal(parseMode({ DSH_LOCAL_SAVER_MODE: "balanced" }), "balanced");
});

test("coding-safe windows a 2000-line source", () => {
  const lines = [];
  lines.push("void wifi_init_sta(void) {}");
  for (let i = 0; i < 1998; i++) lines.push(`int pad_${i} = ${i};`);
  lines.push("void gpio_set_level_wrapper(void) {}");
  const raw = lines.join("\n");
  const out = shrink("read_file", raw, { enabled: true, level: 3, mode: "coding-safe" });
  assert.match(String(out.value), /wifi_init_sta/);
  assert.match(String(out.value), /gpio_set_level_wrapper/);
  assert.ok(String(out.value).length < raw.length);
});

test("find omits node_modules noise", () => {
  const raw = ["/app/src/main.c", "/app/node_modules/foo/index.js", "/app/src/util.c"].join("\n");
  const out = find(raw);
  assert.match(out, /noise paths omitted/);
  assert.doesNotMatch(out, /foo\/index/);
});

test("repeat cache returns digest", () => {
  const block = ("grep hit line\n").repeat(80);
  const a = shrink("grep", block, { enabled: true, level: 3, mode: "coding-safe" });
  const b = shrink("grep", block, { enabled: true, level: 3, mode: "coding-safe" });
  assert.equal(b.filter, "repeat-cache");
  assert.match(String(b.value), /repeat of grep/);
});
