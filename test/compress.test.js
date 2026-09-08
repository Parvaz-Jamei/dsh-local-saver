import { test } from "node:test";
import assert from "node:assert/strict";
import { compressToolText } from "../rtk/compress.js";
import { autoDetectFilter, isGrepLine } from "../rtk/autodetect.js";
import { shrink, createState, parsePersist } from "../saver-core.js";

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
  assert.ok(out.text.length < raw.length);
  assert.match(out.text, /matches in/);
});

test("linux grep block detects grep and shrinks", () => {
  const raw = unixGrepBlock();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "grep");
  const out = compressToolText(raw, 3);
  assert.equal(out.filter, "grep");
  assert.ok(out.saved > 0);
});

test("macos grep block detects grep and shrinks", () => {
  const raw = macGrepBlock();
  assert.equal(autoDetectFilter(raw, 3)?.filterName, "grep");
  const out = compressToolText(raw, 3);
  assert.equal(out.filter, "grep");
  assert.ok(out.saved > 0);
});

test("git diff compresses at level 3 but not via git-diff at level 1", () => {
  const raw = gitDiffBlock();
  const l3 = compressToolText(raw, 3);
  assert.equal(l3.filter, "git-diff");
  assert.ok(l3.saved > 0);
  const l1fn = autoDetectFilter(raw, 1);
  assert.notEqual(l1fn?.filterName, "git-diff");
  const l1 = compressToolText(raw, 1);
  assert.notEqual(l1.filter, "git-diff");
});

test("shrink passes raw through when disabled", () => {
  const raw = winGrepBlock();
  const off = shrink("bash", raw, { enabled: false, level: 3 });
  assert.equal(off.saved, 0);
  assert.equal(off.value, raw);
  const on = shrink("bash", raw, { enabled: true, level: 3 });
  assert.ok(on.saved > 0);
  assert.notEqual(on.value, raw);
});

test("PERSIST unset does not mark persist on", () => {
  assert.equal(parsePersist({}), false);
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "" }), false);
  assert.equal(parsePersist({ DSH_LOCAL_SAVER_PERSIST: "1" }), true);
});

test("createState reads env", () => {
  const s = createState({ DSH_LOCAL_SAVER: "off", DSH_LOCAL_SAVER_LEVEL: "2" });
  assert.equal(s.enabled, false);
  assert.equal(s.level, 2);
});
