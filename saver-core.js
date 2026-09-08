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

export function createState(env = process.env) {
  return {
    enabled: parseEnabled(env),
    level: parseLevel(env),
  };
}

export function shrink(toolName, value, state = { enabled: true, level: DEFAULT_LEVEL }) {
  if (!state?.enabled) return { value, saved: 0, filter: null };
  if (toolName && !TARGETS.has(String(toolName))) return { value, saved: 0, filter: null };
  const raw = extractText(value);
  if (raw == null || raw.length < 500) return { value, saved: 0, filter: null };
  const { text, saved, filter } = compressText(raw, state.level);
  if (saved <= 0) return { value, saved: 0, filter };
  return { value: putText(value, text), saved, filter };
}
