const SUPPORTED = new Set([
  "javascript", "python", "java", "cpp", "rust", "kotlin",
  "swift", "csharp", "go", "html", "shell", "cfamily",
]);

export const LANG_BY_EXT = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  mts: "javascript",
  cts: "javascript",
  py: "python",
  pyw: "python",
  pyi: "python",
  c: "cpp",
  h: "cpp",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  java: "java",
  cs: "csharp",
  go: "go",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  html: "html",
  htm: "html",
  xml: "html",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

const PATH_KEYS = [
  "path", "file", "filePath", "file_path", "filename", "filepath",
  "uri", "target_file", "targetFile", "source", "sourcePath",
];

export function languageFromPath(filePath) {
  const raw = String(filePath || "").trim();
  if (!raw || raw.length > 512) return null;
  const cleaned = raw.replace(/^file:\/\//, "").split("?")[0];
  const base = cleaned.split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return LANG_BY_EXT[ext] || null;
}

export function resolveFilePath(payload, out) {
  const bags = [];
  const add = (obj) => {
    if (obj && typeof obj === "object") bags.push(obj);
  };
  add(payload);
  add(payload?.args);
  add(payload?.arguments);
  add(payload?.input);
  add(payload?.params);
  add(payload?.tool);
  add(out);
  add(out?.meta);
  add(out?.args);
  add(out?.input);
  for (const bag of bags) {
    for (const key of PATH_KEYS) {
      const value = bag[key];
      if (typeof value === "string" && languageFromPath(value)) return value;
    }
  }
  return "";
}

function pathFromReadHeader(text) {
  const lines = String(text || "").split("\n", 4);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^#\s*/, "");
    if (/^(?:[A-Za-z]:)?[\w./\\-]+\.[A-Za-z0-9]{1,8}$/.test(trimmed)) {
      const lang = languageFromPath(trimmed);
      if (lang) return trimmed;
    }
  }
  return "";
}

function shebangLanguage(first) {
  if (!/^#!/.test(first)) return null;
  if (/\b(python3?|pypy)\b/i.test(first)) return "python";
  if (/\b(node|bun|deno|nodejs)\b/i.test(first)) return "javascript";
  if (/\b(bash|zsh|sh|ksh|dash)\b/i.test(first)) return "shell";
  return null;
}

function contentGuess(head) {
  const hits = [];
  const py = /(?:^|\n)(?:def |class |from \w+ import |import \w+|async def )/.test(head) && /:\s*(?:#|\n|$)/.test(head);
  const js = /(?:^|\n)(?:function |const |let |var |export |import )/.test(head) && /=>|;/.test(head);
  const java = /(?:^|\n)\s*(?:package [\w.]+;|import [\w.*]+;|public\s+class\s+\w+)/.test(head);
  const rust = /(?:^|\n)\s*(?:fn\s+\w+|let\s+mut\s+|pub\s+fn\s+)/.test(head) && /->|::/.test(head);
  const kotlin = /(?:^|\n)\s*(?:fun\s+\w+|val\s+\w+|class\s+\w+)/.test(head) && /\b(fun|val|kotlin)\b/.test(head);
  const swift = /(?:^|\n)\s*(?:func\s+\w+|import Foundation|var\s+\w+\s*:)/.test(head);
  const cpp = /(?:^|\n)\s*#include\s*[<"]/.test(head);
  const go = /(?:^|\n)\s*package\s+\w+\s*$/m.test(head) && /\bfunc\s+/.test(head);
  if (py) hits.push("python");
  if (js) hits.push("javascript");
  if (java) hits.push("java");
  if (rust) hits.push("rust");
  if (kotlin) hits.push("kotlin");
  if (swift) hits.push("swift");
  if (cpp) hits.push("cpp");
  if (go) hits.push("go");
  if (/<\s*(html|div|span|body|!DOCTYPE)/i.test(head) && /-->|<\/\w+>/.test(head)) hits.push("html");
  if (hits.length === 1) return hits[0];
  return null;
}

export function detectLanguage(text, options = "") {
  const opts = typeof options === "string" ? { toolName: options } : options || {};
  const src = String(text || "");
  const head = src.slice(0, 2500);
  const first = src.split(/\n/, 1)[0] || "";

  if (opts.language && SUPPORTED.has(opts.language)) return opts.language;

  const path = opts.filePath || opts.path || "";
  const fromPath = languageFromPath(path);
  if (fromPath) return fromPath;

  const shebang = shebangLanguage(first);
  if (shebang) return shebang;

  const headerPath = pathFromReadHeader(src);
  const fromHeader = languageFromPath(headerPath);
  if (fromHeader) return fromHeader;

  return contentGuess(head);
}

export const SUPPORTED_LANGUAGES = [
  "javascript",
  "python",
  "java",
  "cpp",
  "rust",
  "kotlin",
  "swift",
  "csharp",
  "go",
  "html",
  "shell",
];
