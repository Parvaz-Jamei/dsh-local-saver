import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";
import { compressText, extractText, putText } from "./compress.js";

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
export const GIT_FILTERS = new Set(["git-diff", "git-status", "git-log"]);

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
  if (raw === "normal" || raw === "aggressive" || raw === "coding-safe") return raw;
  return "coding-safe";
}

export function createState(env = process.env) {
  return {
    enabled: parseEnabled(env),
    level: parseLevel(env),
    mode: parseMode(env),
  };
}

export function shrink(toolName, value, state = { enabled: true, level: DEFAULT_LEVEL, mode: "coding-safe" }) {
  if (!state?.enabled) return { value, saved: 0, filter: null };
  if (toolName && !TARGETS.has(String(toolName))) return { value, saved: 0, filter: null };
  const mode = state.mode || "coding-safe";
  if (mode === "coding-safe" && SOURCE_TOOLS.has(String(toolName))) {
    return { value, saved: 0, filter: null };
  }
  const raw = extractText(value);
  if (raw == null || raw.length < 500) return { value, saved: 0, filter: null };
  const { text, saved, filter } = compressText(raw, state.level);
  if (mode === "coding-safe" && GIT_FILTERS.has(String(filter))) {
    return { value, saved: 0, filter: null };
  }
  if (saved <= 0) return { value, saved: 0, filter };
  return { value: putText(value, text), saved, filter };
}
