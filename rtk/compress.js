import { RAW_CAP, MIN_COMPRESS_SIZE, DEFAULT_LEVEL, normalizeLevel } from "./constants.js";
import { autoDetectFilter } from "./autodetect.js";
import { safeApply } from "./applyFilter.js";
import { stripAnsi } from "./stripAnsi.js";
import { hardCapChars } from "./hardCap.js";

export function compressToolText(text, level = DEFAULT_LEVEL) {
  if (typeof text !== "string") return { text, saved: 0, filter: null };
  const cleaned = stripAnsi(text);
  let work = cleaned;
  let filter = null;
  if (work.length > RAW_CAP) {
    work = hardCapChars(work, RAW_CAP);
    filter = "raw-cap";
  }
  const bytesIn = work.length;
  if (bytesIn < MIN_COMPRESS_SIZE) {
    return { text: work, saved: Math.max(0, text.length - work.length), filter };
  }
  const fn = autoDetectFilter(work, normalizeLevel(level));
  if (fn) {
    const out = safeApply(fn, work);
    if (out && out.length > 0 && out.length < bytesIn) {
      return {
        text: out,
        saved: text.length - out.length,
        filter: fn.filterName || fn.name || "rtk",
      };
    }
    filter = fn.filterName || filter;
  }
  return { text: work, saved: Math.max(0, text.length - work.length), filter };
}
