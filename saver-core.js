import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";
import { compressText, extractText, putText } from "./compress.js";
import { classify } from "./rtk/classify.js";
import { lightSource } from "./rtk/filters/lightSource.js";
import { gitDiff } from "./rtk/filters/gitDiff.js";
import { tokenReport } from "./rtk/tokens.js";
import { stripAnsi } from "./rtk/stripAnsi.js";
import { hardCapChars, windowText } from "./rtk/hardCap.js";

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

export function parseMode(env = process.env) {
  const raw = String(env.DSH_LOCAL_SAVER_MODE ?? "coding-safe").trim().toLowerCase();
  if (raw === "normal" || raw === "balanced") return "balanced";
  if (raw === "aggressive" || raw === "coding-safe") return raw;
  return "coding-safe";
}

export function createState(env = process.env) {
  return {
    enabled: parseEnabled(env),
    level: parseLevel(env),
    mode: parseMode(env),
  };
}

function allowedTool(name) {
  if (!name) return true;
  const n = String(name);
  if (DENY_TOOLS.has(n)) return false;
  return true;
}

function keepErrors(original, compact) {
  const missing = original.split("\n").filter((l) => ERR_RE.test(l) && !compact.includes(l.slice(0, 60)));
  if (!missing.length) return compact;
  return `${compact}\n--- kept errors ---\n${missing.slice(0, 40).join("\n")}`;
}

function cacheKey(tool, text) {
  return `${tool}|${text.length}|${text.slice(0, 8000)}`;
}

function done(value, before, after, filter, kind) {
  const report = tokenReport(before, after);
  return { value, saved: report.chars_saved, filter, kind, ...report };
}

export function shrink(toolName, value, state = { enabled: true, level: DEFAULT_LEVEL, mode: "coding-safe" }) {
  const empty = { value, saved: 0, filter: null, kind: null, chars_before: 0, chars_after: 0, chars_saved: 0, tokens_before: 0, tokens_after: 0, tokens_saved: 0 };
  if (!state?.enabled) return empty;
  if (!allowedTool(toolName)) return empty;
  const extracted = extractText(value);
  if (extracted == null) return empty;
  const raw = stripAnsi(extracted);
  if (raw.length < 500) return empty;
  const mode = state.mode || "coding-safe";
  const kind = classify(toolName, raw);
  const before = raw.length;
  const key = cacheKey(toolName, raw);
  if (cache.has(key)) {
    const digest = windowText(raw, 12, 8, `[repeat of ${toolName || "tool"} output, 0 new bytes]`);
    return done(putText(value, digest), before, digest.length, "repeat-cache", kind);
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

  text = keepErrors(raw, text);
  const cap = kind === "source" && mode === "coding-safe" ? SOURCE_CAP : RESULT_CAP;
  if (text.length > cap) {
    text = hardCapChars(text, cap);
    filter = filter ? `${filter}+cap` : "hard-cap";
  } else if (filter == null && (raw.split("\n").length > 80 || raw.length > 4000)) {
    text = windowText(raw, 80, 40);
    text = keepErrors(raw, text);
    filter = "fallback-window";
  }

  cache.set(key, true);
  if (cache.size > 64) cache.delete(cache.keys().next().value);

  if (text.length >= before) return done(value, before, before, filter, kind);
  return done(putText(value, text), before, text.length, filter, kind);
}
