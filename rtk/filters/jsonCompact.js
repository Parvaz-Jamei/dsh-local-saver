function cap(val, depth, maxKeys) {
  if (depth <= 0) return "...";
  if (Array.isArray(val)) {
    const slice = val.slice(0, 16).map((v) => cap(v, depth - 1, maxKeys));
    if (val.length > 16) slice.push(`... +${val.length - 16}`);
    return slice;
  }
  if (val && typeof val === "object") {
    const keys = Object.keys(val);
    const out = {};
    for (const k of keys.slice(0, maxKeys)) out[k] = cap(val[k], depth - 1, maxKeys);
    if (keys.length > maxKeys) out.__more = keys.length - maxKeys;
    return out;
  }
  if (typeof val === "string" && val.length > 240) return `${val.slice(0, 240)}...`;
  return val;
}

export function extractJsonCandidate(input) {
  const raw = String(input);
  const i = raw.search(/[\[{]/);
  if (i < 0) return null;
  const slice = raw.slice(i);
  const attempts = [slice];
  const end = Math.max(slice.lastIndexOf("}"), slice.lastIndexOf("]"));
  if (end > 0) attempts.push(slice.slice(0, end + 1));
  for (const s of attempts) {
    try {
      return JSON.parse(s);
    } catch {
      // try next
    }
  }
  return null;
}

export function looksLikeJson(text) {
  return extractJsonCandidate(text) != null;
}

export function jsonCompact(input) {
  const parsed = extractJsonCandidate(input);
  if (parsed == null) return input;
  return JSON.stringify(cap(parsed, 4, 24));
}

jsonCompact.filterName = "json-compact";
