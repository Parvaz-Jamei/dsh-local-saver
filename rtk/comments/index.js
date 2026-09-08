import { detectLanguage, languageFromPath, resolveFilePath, SUPPORTED_LANGUAGES } from "./detect.js";
import { shouldKeepComment } from "./keep.js";
import { findJsComments } from "./langs/javascript.js";
import { findPythonComments } from "./langs/python.js";
import { findHtmlComments } from "./langs/html.js";
import { findShellComments } from "./langs/shell.js";
import {
  findJavaComments,
  findCppComments,
  findRustComments,
  findKotlinComments,
  findSwiftComments,
  findCsharpComments,
  findGoComments,
  findCFamilyComments,
} from "./langs/clike.js";

const SCANNERS = {
  javascript: findJsComments,
  python: findPythonComments,
  java: findJavaComments,
  cpp: findCppComments,
  rust: findRustComments,
  kotlin: findKotlinComments,
  swift: findSwiftComments,
  csharp: findCsharpComments,
  go: findGoComments,
  cfamily: findCFamilyComments,
  html: findHtmlComments,
  shell: findShellComments,
};

function splice(src, removals) {
  if (!removals.length) return src;
  const ordered = [...removals].sort((a, b) => a.start - b.start);
  let out = "";
  let pos = 0;
  for (const r of ordered) {
    if (r.start < pos) continue;
    out += src.slice(pos, r.start);
    if (src.slice(r.start, r.end).includes("\n") && !out.endsWith("\n")) out += "\n";
    pos = r.end;
  }
  return out + src.slice(pos);
}

function optionsOf(toolNameOrOpts) {
  if (toolNameOrOpts && typeof toolNameOrOpts === "object") return toolNameOrOpts;
  return { toolName: toolNameOrOpts || "" };
}

export function scanComments(text, toolNameOrOpts = "") {
  const opts = optionsOf(toolNameOrOpts);
  const language = detectLanguage(text, opts);
  if (!language || !SCANNERS[language]) {
    return { ok: false, reason: "unknown-language", language: language || null, comments: [] };
  }
  const scanned = SCANNERS[language](text);
  if (!scanned.ok) return { ok: false, reason: scanned.reason, language, comments: [] };
  return { ok: true, language, comments: scanned.comments };
}

export function stripSourceComments(text, options = {}) {
  const src = String(text ?? "");
  const preview = options.preview === true;
  const scanned = scanComments(src, options);
  const empty = {
    text: src,
    applied: false,
    preview,
    language: scanned.language,
    reason: scanned.reason || null,
    comments_seen: 0,
    comments_removed: 0,
    comments_kept: 0,
    chars_removed: 0,
  };
  if (!scanned.ok) return empty;

  const removable = [];
  let kept = 0;
  for (const c of scanned.comments) {
    if (c.type === "docstring") {
      kept += 1;
      continue;
    }
    if (shouldKeepComment(c)) {
      kept += 1;
      continue;
    }
    removable.push(c);
  }

  const chars = removable.reduce((n, c) => n + (c.end - c.start), 0);
  const next = preview ? src : splice(src, removable);
  return {
    text: next,
    applied: !preview && removable.length > 0 && next !== src,
    preview,
    language: scanned.language,
    reason: null,
    comments_seen: scanned.comments.length,
    comments_removed: removable.length,
    comments_kept: kept,
    chars_removed: preview ? chars : Math.max(0, src.length - next.length),
  };
}

export { detectLanguage, shouldKeepComment, languageFromPath, resolveFilePath, SUPPORTED_LANGUAGES, SCANNERS };
