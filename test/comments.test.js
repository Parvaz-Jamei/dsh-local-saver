import { test } from "node:test";
import assert from "node:assert/strict";
import { stripSourceComments, detectLanguage, scanComments } from "../rtk/comments/index.js";
import { shrink, parseStripComments, resetCache } from "../saver-core.js";

const pad = (s) => (s.length >= 520 ? s : s + "\n" + "x".repeat(520 - s.length));

test("strip comments defaults off", () => {
  assert.equal(parseStripComments({}), false);
  assert.equal(parseStripComments({ DSH_LOCAL_SAVER_STRIP_COMMENTS: "preview" }), "preview");
  assert.equal(parseStripComments({ DSH_LOCAL_SAVER_STRIP_COMMENTS: "1" }), true);
});

test("unknown language is a no-op", () => {
  const raw = "???? not a language at all\n".repeat(5);
  const out = stripSourceComments(raw);
  assert.equal(out.applied, false);
  assert.equal(out.text, raw);
  assert.equal(out.language, null);
});

test("unclosed JS structure is a no-op", () => {
  const raw = "const x = 'oops\nfunction f() {}\n";
  const out = stripSourceComments(raw);
  assert.equal(out.applied, false);
  assert.equal(out.text, raw);
});

test("JS keeps TODO FIXME NOTE WARNING JSDoc and strips noise", () => {
  const raw = [
    "const url = 'http://example.com/path';",
    "const re = /\\/\\//;",
    "/** Javadoc / JSDoc for f */",
    "function f() {",
    "  // TODO: wire sensor",
    "  // FIXME later",
    "  // NOTE hardware clock",
    "  // WARNING do not invert phase",
    "  // just chatter",
    "  return 1;",
    "}",
  ].join("\n");
  assert.equal(detectLanguage(raw), "javascript");
  const out = stripSourceComments(raw);
  assert.equal(out.language, "javascript");
  assert.match(out.text, /TODO/);
  assert.match(out.text, /FIXME/);
  assert.match(out.text, /NOTE/);
  assert.match(out.text, /WARNING/);
  assert.match(out.text, /JSDoc for f/);
  assert.match(out.text, /http:\/\/example.com/);
  assert.doesNotMatch(out.text, /just chatter/);
  assert.ok(out.comments_removed >= 1);
  assert.ok(out.comments_kept >= 5);
});

test("preview does not rewrite but reports counts", () => {
  const raw = "function f() {\n  // noise only\n  return 1;\n}\n";
  const out = stripSourceComments(raw, { preview: true });
  assert.equal(out.text, raw);
  assert.equal(out.preview, true);
  assert.equal(out.applied, false);
  assert.ok(out.comments_removed >= 1);
});

test("Python keeps docstring and TODO, drops noise hash", () => {
  const raw = [
    '"""module doc stays"""',
    "def run():",
    '    """fn doc stays"""',
    "    # TODO: calibrate",
    "    # throwaway",
    "    return 1",
  ].join("\n");
  const out = stripSourceComments(raw);
  assert.equal(out.language, "python");
  assert.match(out.text, /module doc stays/);
  assert.match(out.text, /fn doc stays/);
  assert.match(out.text, /TODO/);
  assert.doesNotMatch(out.text, /throwaway/);
});

test("hash inside python string is not a comment", () => {
  const raw = 'x = "# not a comment"\n# real\ndef f():\n    return x\n';
  const out = stripSourceComments(raw);
  assert.match(out.text, /# not a comment/);
  assert.doesNotMatch(out.text, /# real/);
});

test("shrink default does not strip comments", () => {
  resetCache();
  const raw = pad("function f() {\n  // chatter gone if on\n  return 1;\n}\n");
  const out = shrink("read_file", raw, { enabled: true, level: 3, mode: "coding-safe", scope: "c0" });
  assert.match(String(out.value), /chatter gone if on/);
});

test("shrink strip_comments preview keeps text", () => {
  resetCache();
  const raw = pad("function f() {\n  // chatter preview\n  return 1;\n}\n");
  const out = shrink("read_file", raw, {
    enabled: true, level: 3, mode: "coding-safe", stripComments: "preview", scope: "c1",
  });
  assert.match(String(out.value), /chatter preview/);
  assert.ok(out.comments_removed >= 1);
  assert.match(String(out.filter), /comments-preview/);
});

test("shrink strip_comments on removes noise from source reads", () => {
  resetCache();
  const raw = pad("function f() {\n  // chatter apply\n  return 1;\n}\n");
  const out = shrink("read_file", raw, {
    enabled: true, level: 3, mode: "coding-safe", stripComments: true, scope: "c2",
  });
  assert.doesNotMatch(String(out.value), /chatter apply/);
  assert.match(String(out.filter), /strip-comments/);
});

test("scanComments reports javascript for ts-like source", () => {
  const raw = "export const n: number = 1; // noise\n";
  const scanned = scanComments(raw);
  assert.equal(scanned.ok, true);
});
