import { RAW_CAP, MIN_COMPRESS_SIZE, DEFAULT_LEVEL, normalizeLevel } from "./constants.js";
import { autoDetectFilter } from "./autodetect.js";
import { safeApply } from "./applyFilter.js";

export function compressToolText(text, level = DEFAULT_LEVEL) {
  if (typeof text !== "string") return { text, saved: 0, filter: null };
  const bytesIn = text.length;
  if (bytesIn < MIN_COMPRESS_SIZE || bytesIn > RAW_CAP) {
    return { text, saved: 0, filter: null };
  }
  const fn = autoDetectFilter(text, normalizeLevel(level));
  if (!fn) return { text, saved: 0, filter: null };
  const out = safeApply(fn, text);
  if (!out || out.length === 0 || out.length >= bytesIn) {
    return { text, saved: 0, filter: fn.filterName || fn.name || null };
  }
  return {
    text: out,
    saved: bytesIn - out.length,
    filter: fn.filterName || fn.name || "rtk",
  };
}
