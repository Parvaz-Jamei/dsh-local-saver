import { compressToolText } from "./rtk/compress.js";
import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";

export function extractText(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block.text === "string") return block.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.output === "string") return value.output;
    if (typeof value.stdout === "string" || typeof value.stderr === "string") {
      return [value.stdout, value.stderr].filter(Boolean).join("\n");
    }
    if (Array.isArray(value.content)) return extractText(value.content);
  }
  return null;
}

export function putText(value, text) {
  if (typeof value === "string") return text;
  if (Array.isArray(value)) return [{ type: "text", text }];
  if (value && typeof value === "object") {
    const next = { ...value };
    if (typeof next.stdout === "string" && typeof next.stderr === "string") {
      next.stdout = text;
      next.stderr = "";
      next.text = text;
      return next;
    }
    if ("text" in next && typeof next.text === "string") next.text = text;
    else if ("output" in next && typeof next.output === "string") next.output = text;
    else if ("stdout" in next) next.stdout = text;
    else if (Array.isArray(next.content)) next.content = [{ type: "text", text }];
    else next.text = text;
    return next;
  }
  return text;
}

export function compressText(raw, level = DEFAULT_LEVEL) {
  const { text, saved, filter } = compressToolText(String(raw ?? ""), normalizeLevel(level));
  return { text, original: String(raw ?? "").length, saved, filter };
}
