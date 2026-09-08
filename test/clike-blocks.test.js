import { test } from "node:test";
import assert from "node:assert/strict";
import { stripSourceComments } from "../rtk/comments/index.js";
import {
  findJavaComments,
  findCppComments,
  findRustComments,
  findKotlinComments,
  findSwiftComments,
  findCsharpComments,
  findGoComments,
  scanCppRaw,
  scanRustRaw,
  scanClike,
} from "../rtk/comments/langs/clike.js";

test("block comments are recorded and cursor advances past */", () => {
  const src = "int a; /* noise */ int b;";
  const scanned = findCppComments(src);
  assert.equal(scanned.ok, true);
  assert.equal(scanned.comments.length, 1);
  assert.equal(scanned.comments[0].value, "/* noise */");
  assert.equal(scanned.comments[0].end, src.indexOf(" int b"));
});

test("unclosed block comment is a total no-op", () => {
  const raw = "public class T {\n  /* unclosed\n  int x = 1;\n}\n";
  const scanned = findJavaComments(raw);
  assert.equal(scanned.ok, false);
  assert.equal(scanned.reason, "unclosed-block-comment");
  const out = stripSourceComments(raw, { filePath: "T.java" });
  assert.equal(out.applied, false);
  assert.equal(out.text, raw);
});

test("Java strips /* noise */ and keeps Javadoc plus text-block slashes", () => {
  const raw = [
    "public class T {",
    "  /* noise */",
    "  /** Javadoc stays */",
    "  String text = \"\"\"",
    "  // not comment",
    "  /* also not */",
    "  \"\"\";",
    "  int x = 1;",
    "}",
  ].join("\n");
  const out = stripSourceComments(raw, { filePath: "T.java" });
  assert.equal(out.language, "java");
  assert.doesNotMatch(out.text, /\/\* noise \*\//);
  assert.match(out.text, /Javadoc stays/);
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* also not \*\//);
});

test("C++ strips block comments and keeps raw-string slashes", () => {
  const raw = [
    "#include <string>",
    "int main() {",
    "  /* block noise */",
    "  auto s = R\"xx(// not comment /* neither */)xx\";",
    "  // chatter",
    "  return 0;",
    "}",
  ].join("\n");
  const scanned = findCppComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* block noise */"));
  const out = stripSourceComments(raw, { filePath: "main.cpp" });
  assert.doesNotMatch(out.text, /block noise/);
  assert.doesNotMatch(out.text, /chatter/);
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* neither \*\//);
});

test("scanCppRaw is used for R\"delim()delim\"", () => {
  const src = `R"xx(// not)xx"`;
  const hit = scanCppRaw(src, 0);
  assert.equal(hit.end, src.length);
});

test("Rust strips /* */ and keeps raw string slashes", () => {
  const raw = [
    "fn main() {",
    "    /* block noise */",
    "    let a = r#\"// not comment /* neither */\"#;",
    "    // chatter",
    "}",
  ].join("\n");
  const scanned = findRustComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* block noise */"));
  const out = stripSourceComments(raw, { filePath: "main.rs" });
  assert.doesNotMatch(out.text, /block noise/);
  assert.doesNotMatch(out.text, /chatter/);
  assert.match(out.text, /\/\/ not comment/);
});

test("scanRustRaw is used for r#\"...\"#", () => {
  const src = `r#"// not"#`;
  const hit = scanRustRaw(src, 0);
  assert.equal(hit.end, src.length);
});

test("Kotlin keeps triple-quoted slashes and strips /* noise */", () => {
  const raw = [
    "fun main() {",
    "  /* noise */",
    "  val s = \"\"\"",
    "  // not comment",
    "  \"\"\"",
    "}",
  ].join("\n");
  const scanned = findKotlinComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* noise */"));
  const out = stripSourceComments(raw, { filePath: "Main.kt" });
  assert.doesNotMatch(out.text, /\/\* noise \*\//);
  assert.match(out.text, /\/\/ not comment/);
});

test("Swift keeps multiline/raw slashes and strips /* noise */", () => {
  const raw = [
    "import Foundation",
    "/* noise */",
    "let a = \"\"\"",
    "// not comment",
    "\"\"\"",
    "let b = #\" /* also not */ \"#",
    "func f() {}",
  ].join("\n");
  const scanned = findSwiftComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* noise */"));
  const out = stripSourceComments(raw, { filePath: "A.swift" });
  assert.doesNotMatch(out.text, /\/\* noise \*\//);
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* also not \*\//);
});

test("C# verbatim and raw strings keep slashes; /* noise */ drops", () => {
  const raw = [
    "class T {",
    "  /* noise */",
    "  string a = @\"// not comment\";",
    "  string b = \"\"\"",
    "  /* also not */",
    "  \"\"\";",
    "}",
  ].join("\n");
  const scanned = findCsharpComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* noise */"));
  const out = stripSourceComments(raw, { filePath: "T.cs" });
  assert.doesNotMatch(out.text, /\/\* noise \*\//);
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* also not \*\//);
});

test("Go raw backticks keep slashes; /* noise */ drops", () => {
  const raw = [
    "package main",
    "func main() {",
    "  /* noise */",
    "  s := `// not comment /* neither */`",
    "}",
  ].join("\n");
  const scanned = findGoComments(raw);
  assert.ok(scanned.comments.some((c) => c.value === "/* noise */"));
  const out = stripSourceComments(raw, { filePath: "main.go" });
  assert.doesNotMatch(out.text, /\/\* noise \*\//);
  assert.match(out.text, /\/\/ not comment/);
  assert.match(out.text, /\/\* neither \*\//);
});

test("inner // inside a block comment is not a second comment", () => {
  const src = "int a; /* // inner */ int b;";
  const scanned = scanClike(src, { cppRaw: true });
  assert.equal(scanned.ok, true);
  assert.equal(scanned.comments.length, 1);
  assert.equal(scanned.comments[0].value, "/* // inner */");
});
