import { createHash } from "node:crypto";
import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";
import { compressText, extractText, putText } from "./compress.js";
import { classify } from "./rtk/classify.js";
import { lightSource } from "./rtk/filters/lightSource.js";
import { gitDiff } from "./rtk/filters/gitDiff.js";
import { jsonCompact, looksLikeJson } from "./rtk/filters/jsonCompact.js";
import { tokenReport } from "./rtk/tokens.js";
import { stripAnsi } from "./rtk/stripAnsi.js";
import { hardCapChars, windowText } from "./rtk/hardCap.js";
import { stripSourceComments, resolveFilePath } from "./rtk/comments/index.js";

export const TARGETS = new Set([
  "bash", "pwsh", "grep", "read", "read_file", "exec", "run_code",
  "ls", "find", "glob", "search", "web_search", "browser",
]);

export const DENY_TOOLS = new Set([
  "write", "edit", "apply_patch", "str_replace", "delete_file", "notebook_edit",
]);

export const SOURCE_TOOLS = new Set(["read", "read_file"]);

const RESULT_CAP = 12000;
const SOURCE_CAP = 24000;
const cache = new Map();

const ERR_RE = /error:|Traceback|BUILD FAILED|fatal error|undefined reference|Error at line/i;
const ANSI_RE = /\u001b\[/;

export function parseEnabled(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER ?? "").trim().toLowerCase();
  if (raw === "off" || raw === "0" || raw === "false") return false;
  return true;
}

export function parseLevel(env = process.env) {
  return normalizeLevel(env.DSH_LOCAL_SAVER_LEVEL);
}

export function parsePersist(env = process.env) {
  return String(env.DSH_LOCAL_SAVER_PERSIST ?? "").trim() === "1";
}

export function parseCaveman(env = process.env) {
  return String(env.DSH_LOCAL_SAVER_CAVEMAN ?? "").trim() === "1";
}

export function parseDryRun(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER_DRY_RUN ?? "").trim().toLowerCase();
  return raw === "1" || raw === "on" || raw === "true";
}

export function parseStripAnsi(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER_STRIP_ANSI ?? "").trim().toLowerCase();
  if (raw === "0" || raw === "off" || raw === "false") return false;
  return true;
}

export function parseStripComments(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER_STRIP_COMMENTS ?? "").trim().toLowerCase();
  if (raw === "preview" || raw === "dry" || raw === "dry-run") return "preview";
  if (raw === "1" || raw === "on" || raw === "true") return true;
  return false;
}

export function parseMode(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER_MODE ?? "coding-safe").trim().toLowerCase();
  if (raw === "normal" || raw === "balanced") return "balanced";
  if (raw === "aggressive" || raw === "coding-safe") return raw;
  return "coding-safe";
}

export function cacheScope(env = process.env) {
  return env.DSH_SESSION || env.DSH_WORKSPACE || env.PWD || process.cwd();
}

export function createState(env = process.env) {
  return {
    enabled: parseEnabled(env),
    level: parseLevel(env),
    mode: parseMode(env),
    dryRun: parseDryRun(env),
    stripAnsi: parseStripAnsi(env),
    stripComments: parseStripComments(env),
    scope: cacheScope(env),
  };
}

export function contentHash(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

export function cacheKey(tool, text, scope = cacheScope(), extra = "") {
  return `${scope}|${tool || "-"}|${extra}|${contentHash(text)}`;
}

export function resolveToolName(payload, out) {
  const src = payload && typeof payload === "object" ? payload : {};
  const res = out && typeof out === "object" ? out : {};
  return String(
    src.name || src.toolName || src.tool_name || src.tool ||
      res.name || res.toolName || res.tool_name || "",
  );
}

export { resolveFilePath };

function allowCommentStrip(toolName, kind, raw = "") {
  const name = String(toolName || "");
  if (DENY_TOOLS.has(name)) return false;
  if (!SOURCE_TOOLS.has(name)) return false;
  if (kind === "git-diff") return false;
  if (/^diff --git /m.test(String(raw))) return false;
  return true;
}

function allowedTool(name) {
  if (!name) return true;
  return !DENY_TOOLS.has(String(name));
}

function keepErrors(original, compact) {
  const missing = original.split("\n").filter((l) => ERR_RE.test(l) && !compact.includes(l.slice(0, 60)));
  if (!missing.length) return compact;
  return `${compact}\n--- kept errors ---\n${missing.slice(0, 40).join("\n")}`;
}

function capByKind(kind, raw, text, cap) {
  if (kind === "git-diff" || (typeof raw === "string" && /^diff --git /m.test(raw))) {
    return gitDiff(raw, Math.min(400, cap / 20)) || windowText(text, 80, 40);
  }
  if (kind === "source" || looksLikeJson(text) || looksLikeJson(raw)) {
    if (looksLikeJson(raw)) {
      const compact = jsonCompact(raw);
      return compact.length <= cap ? compact : hardCapChars(compact, cap);
    }
    return windowText(text, 120, 60);
  }
  return hardCapChars(text, cap);
}

function maybeStrip(text, state, kind) {
  if (!state.stripAnsi) return text;
  if (kind === "source" && state.mode === "coding-safe") return text;
  if (!ANSI_RE.test(text) && !text.includes("\r")) return text;
  return stripAnsi(text);
}

function done(value, before, after, filter, kind, extra = {}) {
  const report = tokenReport(before, after);
  return { value, saved: report.chars_saved, filter, kind, processed: true, ...report, ...extra };
}

export function shrink(toolName, value, state = { enabled: true, level: DEFAULT_LEVEL, mode: "coding-safe" }) {
  const empty = {
    value, saved: 0, filter: null, kind: null, processed: false,
    chars_before: 0, chars_after: 0, chars_saved: 0,
    tokens_before: 0, tokens_after: 0, tokens_saved: 0,
  };
  if (!state?.enabled) return empty;
  if (!allowedTool(toolName)) return empty;
  const extracted = extractText(value);
  if (extracted == null) return { ...empty, filter: "unparsed" };
  const kindGuess = classify(toolName, extracted);
  const raw = maybeStrip(extracted, { stripAnsi: state.stripAnsi !== false, mode: state.mode || "coding-safe" }, kindGuess);
  if (raw.length < 500) return { ...empty, processed: true, kind: kindGuess };
  const mode = state.mode || "coding-safe";
  const kind = classify(toolName, raw);
  const before = raw.length;
  const key = cacheKey(toolName, raw, state.scope, String(state.stripComments || ""));
  if (cache.has(key)) {
    const digest = windowText(raw, 12, 8, `[repeat of ${toolName || "tool"} output, 0 new bytes]`);
    const outVal = state.dryRun ? value : putText(value, digest);
    return done(outVal, before, digest.length, state.dryRun ? "repeat-cache+dry-run" : "repeat-cache", kind);
  }

  let text = raw;
  let filter = null;

  if (mode !== "aggressive" && (kind === "source" || SOURCE_TOOLS.has(String(toolName)))) {
    text = lightSource(raw);
    filter = "light-source";
  } else if (mode !== "aggressive" && kind === "git-diff") {
    text = gitDiff(raw, 500, { keepAll: true }) || raw;
    filter = "git-diff-safe";
  } else {
    const c = compressText(raw, state.level);
    text = c.text;
    filter = c.filter;
  }

  const cap = kind === "source" && mode === "coding-safe" ? SOURCE_CAP : RESULT_CAP;
  if (text.length > cap) {
    text = capByKind(kind, raw, text, cap);
    filter = filter ? `${filter}+cap` : "hard-cap";
  } else if (filter == null && (raw.split("\n").length > 80 || raw.length > 4000)) {
    text = windowText(raw, 80, 40);
    filter = "fallback-window";
  }
  text = keepErrors(raw, text);

  let commentMeta = null;
  const stripMode = state.stripComments;
  if (stripMode && allowCommentStrip(toolName, kind, raw)) {
    const preview = stripMode === "preview" || !!state.dryRun;
    const cut = stripSourceComments(text, {
      preview,
      toolName,
      filePath: state.filePath || "",
    });
    commentMeta = {
      comments_language: cut.language,
      comments_seen: cut.comments_seen,
      comments_removed: cut.comments_removed,
      comments_kept: cut.comments_kept,
      comments_preview: cut.preview,
    };
    if (cut.applied) {
      text = cut.text;
      filter = filter ? `${filter}+strip-comments` : "strip-comments";
    } else if (cut.preview && cut.comments_removed > 0) {
      filter = filter ? `${filter}+comments-preview` : "comments-preview";
    }
  }

  cache.set(key, true);
  if (cache.size > 64) cache.delete(cache.keys().next().value);

  if (state.dryRun) return done(value, before, Math.min(text.length, before), `${filter || "none"}+dry-run`, kind, commentMeta || {});
  if (text.length >= before) return done(value, before, before, filter, kind, commentMeta || {});
  return done(putText(value, text), before, text.length, filter, kind, commentMeta || {});
}

export function resetCache() {
  cache.clear();
}
