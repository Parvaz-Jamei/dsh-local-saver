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

test("mentions of example.py do not override JS when path is .js", () => {
  const raw = "const sample = 'example.py';\nfunction f() { return 1; }\n";
  assert.equal(detectLanguage(raw, { filePath: "src/app.js" }), "javascript");
});

test("unknown or ambiguous language removes nothing", () => {
  const raw = "package mystery\nval x = 1\nfun main() {}\nconst y = 2;\n";
  const out = stripSourceComments(raw);
  assert.equal(out.text, raw);
  assert.equal(out.applied, false);
});

test("Java text block keeps slashes that look like comments", () => {
  const raw = [
    "public class T {",
    "  String text = \"\"\"",
    "  // this is not a comment",
    "  /* also not a comment */",
    "  \"\"\";",
    "  // real chatter",
    "  int x = 1;",
    "}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "T.java" });
  assert.equal(out.language, "java");
  assert.match(out.text, /\/\/ this is not a comment/);
  assert.match(out.text, /\/\* also not a comment \*\//);
  assert.doesNotMatch(out.text, /real chatter/);
});

test("Java unclosed text block is a no-op", () => {
  const raw = "public class T {\n  String x = \"\"\"\n  // trapped\n}\n";
  const out = stripSourceComments(raw, { filePath: "T.java" });
  assert.equal(out.applied, false);
  assert.equal(out.text, raw);
});

test("Kotlin triple-quoted string is not stripped", () => {
  const raw = [
    "fun main() {",
    "  val s = \"\"\"",
    "  // not comment",
    "  \"\"\"",
    "  // chatter",
    "}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "Main.kt" });
  assert.equal(out.language, "kotlin");
  assert.match(out.text, /\/\/ not comment/);
  assert.doesNotMatch(out.text, /chatter/);
});

test("Swift multiline and raw strings keep slashes", () => {
  const raw = [
    "import Foundation",
    "let a = \"\"\"",
    "// not comment",
    "\"\"\"",
    "let b = #\" /* also not */ \"#",
    "// chatter",
    "func f() {}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "A.swift" });
  assert.equal(out.language, "swift");
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* also not \*\//);
  assert.doesNotMatch(out.text, /chatter/);
});

test("Rust raw strings keep slashes", () => {
  const raw = [
    "fn main() {",
    "    let a = r#\"// not comment /* neither */\"#;",
    "    let b = r\"http://example.com\";",
    "    // chatter",
    "}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "main.rs" });
  assert.equal(out.language, "rust");
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /http:\/\/example.com/);
  assert.doesNotMatch(out.text, /chatter/);
});

test("C++ raw strings keep slashes", () => {
  const raw = [
    "#include <string>",
    "int main() {",
    "  auto s = R\"xx(// not comment /* neither */)xx\";",
    "  // chatter",
    "  return 0;",
    "}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "main.cpp" });
  assert.equal(out.language, "cpp");
  assert.match(out.text, /\/\/ not comment/);
  assert.doesNotMatch(out.text, /chatter/);
});

test("URL and regex with slashes stay intact in JS", () => {
  const raw = [
    "const url = 'http://example.com/a//b';",
    "const re = /https:\\/\\/x/;",
    "const re2 = /a\\/\\/b/g;",
    "// chatter",
    "function f() { return url; }",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "app.js" });
  assert.match(out.text, /http:\/\/example.com\/a\/\/b/);
  assert.match(out.text, /https:\\\/\\\//);
  assert.match(out.text, /a\\\/\\\/b/);
  assert.doesNotMatch(out.text, /chatter/);
});

test("comment markers inside JS strings stay", () => {
  const raw = "const a = '// not';\nconst b = '/* not */';\n// chatter\nfunction f(){return a;}\n";
  const out = stripSourceComments(raw, { filePath: "app.js" });
  assert.match(out.text, /\/\/ not/);
  assert.match(out.text, /\/\* not \*\//);
  assert.doesNotMatch(out.text, /chatter/);
});

test("shrink never strips comments on git, write, edit, bash", () => {
  resetCache();
  const src = pad("function f() {\n  // chatter must stay\n  return 1;\n}\n");
  const st = { enabled: true, level: 3, mode: "coding-safe", stripComments: true, scope: "deny" };
  for (const tool of ["write", "edit", "apply_patch", "bash"]) {
    const out = shrink(tool, src, { ...st, scope: `deny-${tool}` });
    assert.match(String(out.value), /chatter must stay/, tool);
    assert.doesNotMatch(String(out.filter || ""), /strip-comments/, tool);
  }
  const diff = pad("diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1 +1 @@\n+// chatter\n");
  const out = shrink("read_file", diff, { ...st, scope: "deny-diff" });
  assert.doesNotMatch(String(out.filter || ""), /strip-comments/);
});

test("preview reports seen/removed/kept without rewriting", () => {
  const raw = "function f() {\n  // TODO keep\n  // drop me\n  return 1;\n}\n";
  const out = stripSourceComments(raw, { preview: true, filePath: "a.js" });
  assert.equal(out.text, raw);
  assert.equal(out.preview, true);
  assert.ok(out.comments_seen >= 2);
  assert.ok(out.comments_removed >= 1);
  assert.ok(out.comments_kept >= 1);
});

test("stripping does not drop executable JS tokens", () => {
  const raw = "function f(x) {\n  // noise\n  return x + 1;\n}\n";
  const out = stripSourceComments(raw, { filePath: "a.js" });
  assert.match(out.text, /function f\(x\)/);
  assert.match(out.text, /return x \+ 1/);
});
