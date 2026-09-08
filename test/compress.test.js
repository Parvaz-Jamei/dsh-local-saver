import { test } from "node:test";
import assert from "node:assert/strict";
import { compressToolText } from "../rtk/compress.js";
import { autoDetectFilter, isGrepLine } from "../rtk/autodetect.js";
import { shrink, createState, parsePersist, parseMode } from "../saver-core.js";

function pad(block, min = 520) {
  if (block.length >= min) return block;
  return block + "\n" + "x".repeat(min - block.length);
}
function winGrepBlock() {
  const lines = [];
  for (let n = 1; n <= 20; n++) lines.push(`C:\\Users\\me\\project\\src\\index.js:${n}: const v${n} = ${n};`);
  return pad(lines.join("\n"));
}
function unixGrepBlock() {
  const lines = [];
  for (let n = 1; n <= 20; n++) lines.push(`/home/me/project/src/index.js:${n}: const v${n} = ${n};`);
  return pad(lines.join("\n"));
}
function macGrepBlock() {
  const lines = [];
  for (let n = 1; n <= 20; n++) lines.push(`/Users/me/project/src/index.js:${n}: const v${n} = ${n};`);
  return pad(lines.join("\n"));
}
function gitDiffBlock() {
  const lines = ["diff --git a/a.js b/a.js", "index 111..222 100644", "--- a/a.js", "+++ b/a.js", "@@ -1,200 +1,200 @@"];
  for (let i = 0; i < 220; i++) lines.push(i % 2 ? `+added line ${i} extra payload padding` : `-removed line ${i} extra payload padding`);
  return pad(lines.join("\n"));
}
function gccLog() {
  const lines = [];
  for (let i = 0; i < 40; i++) lines.push(`Compiling src/file_${i}.c`);
  lines.push("src/main.c:342:5: error: expected ';' before 'return'");
  lines.push("make: *** [main.o] Error 1");
  return pad(lines.join("\n"));
}

test("isGrepLine accepts linux, macos, and windows paths", () => {
  assert.equal(isGrepLine("/home/me/src/a.js:10: foo"), true);
  assert.equal(isGrepLine("/Users/me/src/a.js:10: foo"), true);
  assert.equal(isGrepLine("C:\\Users\\me\\project\\src\\index.js:10: content"), true);
  assert.equal(isGrepLine("C:/Users/me/project/src/index.js:10: content"), true);
  assert.equal(isGrepLine("not-grep"), false);
});

test("windows grep block detects grep and shrinks", () => {
  const raw = winGrepBlock();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "grep");
  const out = compressToolText(raw, 3);
  assert.equal(out.filter, "grep");
  assert.ok(out.saved > 0);
});

test("linux grep block detects grep and shrinks", () => {
  const raw = unixGrepBlock();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "grep");
  assert.ok(compressToolText(raw, 3).saved > 0);
});

test("macos grep block detects grep and shrinks", () => {
  const raw = macGrepBlock();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "grep");
  assert.ok(compressToolText(raw, 3).saved > 0);
});

test("git diff compresses at level 3 but not via git-diff at level 1", () => {
  const raw = gitDiffBlock();
  const l3 = compressToolText(raw, 3);
  assert.equal(l3.filter, "git-diff");
  assert.ok(l3.saved > 0);
  assert.notEqual(autoDetectFilter(raw, 1)?.filterName, "git-diff");
});

test("shrink passes raw through when disabled", () => {
  const raw = winGrepBlock();
  const off = shrink("bash", raw, { enabled: false, level: 3, mode: "aggressive" });
  assert.equal(off.saved, 0);
  assert.equal(off.value, raw);
  const on = shrink("bash", raw, { enabled: true, level: 3, mode: "aggressive" });
  assert.ok(on.saved > 0);
});

test("PERSIST unset does not mark persist on", () => {
  assert.equal(parsePersist({}), false);
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "1" }), true);
});

test("createState reads env", () => {
  const s = createState({ DSH_LOCAL_SAVER: "off", DSH_LOCAL_SAVER_LEVEL: "2" });
  assert.equal(s.enabled, false);
  assert.equal(s.level, 2);
  assert.equal(s.mode, "coding-safe");
});

test("parseMode aliases", () => {
  assert.equal(parseMode({}), "coding-safe");
  assert.equal(parseMode({ DSH_LOCAL_SAVER_MODE: "normal" }), "balanced");
  assert.equal(parseMode({ DSH_LOCAL_SAVER_MODE: "aggressive" }), "aggressive");
});

test("coding-safe keeps source functions and diff hunk tails", () => {
  const src = pad("void wifi_init_sta(void) {\n  gpio_set_level(2, 1);\n}\n".repeat(30));
  const read = shrink("read_file", src, { enabled: true, level: 3, mode: "coding-safe" });
  assert.match(String(read.value), /wifi_init_sta/);
  assert.match(String(read.value), /gpio_set_level/);
  const diff = gitDiffBlock();
  const d = shrink("bash", diff, { enabled: true, level: 3, mode: "coding-safe" });
  assert.match(String(d.value), /added line 219/);
  assert.match(String(d.value), /removed line 218/);
  assert.ok(d.filter === "git-diff-safe" || d.saved === 0);
});

test("coding-safe still shrinks grep", () => {
  const raw = unixGrepBlock();
  const out = shrink("grep", raw, { enabled: true, level: 3, mode: "coding-safe" });
  assert.ok(out.saved > 0);
});

test("gcc/idf diagnostics survive build-output", () => {
  const raw = gccLog();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "build-output");
  const out = compressToolText(raw, 3);
  assert.match(out.text, /expected ';' before 'return'/);
  assert.match(out.text, /make: \*\*\*/);
});
