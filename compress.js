import { compressToolText } from "./rtk/compress.js";
import { DEFAULT_LEVEL, normalizeLevel } from "./rtk/constants.js";

export function extractText(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((block) => {
        if (typeof block === "string") return block;
        if (block && typeof block.text === "string") return block.text;
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (typeof value.output === "string") return value.output;
    if (typeof value.result === "string") return value.result;
    if (typeof value.message === "string") return value.message;
    if (typeof value.stdout === "string" || typeof value.stderr === "string") {
      return [value.stdout, value.stderr].filter(Boolean).join("\n");
    }
    if (Array.isArray(value.content)) return extractText(value.content);
    if (value.data != null && (typeof value.data === "string" || Array.isArray(value.data))) {
      return extractText(value.data);
    }
  }
  return null;
}

export function putText(value, text) {
  if (typeof value === "string") return text;
  if (Array.isArray(value)) {
    let replaced = false;
    return value.map((block) => {
      if (typeof block === "string") {
        if (replaced) return "";
        replaced = true;
        return text;
      }
      if (block && typeof block.text === "string") {
        if (replaced) return { ...block, text: "" };
        replaced = true;
        return { ...block, text };
      }
      return block;
    });
  }
  if (value && typeof value === "object") {
    const next = { ...value };
    if (typeof next.stdout === "string" || typeof next.stderr === "string") {
      next.stdout = text;
      if (typeof next.text === "string" || next.text === undefined) next.text = text;
      return next;
    }
    if ("text" in next && typeof next.text === "string") next.text = text;
    else if ("output" in next && typeof next.output === "string") next.output = text;
    else if ("result" in next && typeof next.result === "string") next.result = text;
    else if ("message" in next && typeof next.message === "string") next.message = text;
    else if (Array.isArray(next.content)) next.content = putText(next.content, text);
    else next.text = text;
    return next;
  }
  return text;
}

export function compressText(raw, level = DEFAULT_LEVEL) {
  const { text, saved, filter } = compressToolText(String(raw ?? ""), normalizeLevel(level));
  return { text, original: String(raw ?? "").length, saved, filter };
}
