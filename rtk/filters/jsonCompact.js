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

export function jsonCompact(input) {
  const raw = String(input).trim();
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(cap(parsed, 4, 24));
  } catch {
    return input;
  }
}

jsonCompact.filterName = "json-compact";
