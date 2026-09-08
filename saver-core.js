import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";
import { compressText, extractText, putText } from "./compress.js";
import { classify } from "./rtk/classify.js";
import { lightSource } from "./rtk/filters/lightSource.js";
import { gitDiff } from "./rtk/filters/gitDiff.js";
import { tokenReport } from "./rtk/tokens.js";

export const TARGETS = new Set([
  "bash",
  "pwsh",
  "grep",
  "read",
  "read_file",
  "exec",
  "run_code",
]);

export const SOURCE_TOOLS = new Set(["read", "read_file"]);

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

function done(value, before, after, filter, kind) {
  const saved = Math.max(0, before - after);
  const report = tokenReport(before, after);
  return { value, saved, filter, kind, ...report };
}

export function shrink(toolName, value, state = { enabled: true, level: DEFAULT_LEVEL, mode: "coding-safe" }) {
  const empty = { value, saved: 0, filter: null, kind: null, chars_before: 0, chars_after: 0, chars_saved: 0, tokens_before: 0, tokens_after: 0, tokens_saved: 0 };
  if (!state?.enabled) return empty;
  if (toolName && !TARGETS.has(String(toolName))) return empty;
  const raw = extractText(value);
  if (raw == null || raw.length < 500) return empty;
  const mode = state.mode || "coding-safe";
  const kind = classify(toolName, raw);
  const before = raw.length;

  if (mode !== "aggressive" && (kind === "source" || SOURCE_TOOLS.has(String(toolName)))) {
    const text = lightSource(raw);
    if (text.length >= before) return done(value, before, before, "light-source", kind);
    return done(putText(value, text), before, text.length, "light-source", kind);
  }

  if (mode !== "aggressive" && kind === "git-diff") {
    const text = gitDiff(raw, 500, { keepAll: true });
    if (!text || text.length >= before) return done(value, before, before, "git-diff-safe", kind);
    return done(putText(value, text), before, text.length, "git-diff-safe", kind);
  }

  const { text, saved, filter } = compressText(raw, state.level);
  if (saved <= 0) return done(value, before, before, filter, kind);
  return done(putText(value, text), before, text.length, filter, kind);
}
