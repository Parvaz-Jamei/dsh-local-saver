export function findShellComments(src) {
  const s = String(src);
  const n = s.length;
  const comments = [];
  let i = 0;
  if (s.startsWith("#!")) {
    while (i < n && s[i] !== "\n") i += 1;
  }
  while (i < n) {
    const c = s[i];
    if (c === "'" ) {
      i += 1;
      while (i < n && s[i] !== "'") i += 1;
      if (i >= n) return { ok: false, reason: "unclosed-string" };
      i += 1;
      continue;
    }
    if (c === '"') {
      i += 1;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (c === "#") {
      const start = i;
      while (i < n && s[i] !== "\n") i += 1;
      comments.push({ start, end: i, type: "line", value: s.slice(start, i) });
      continue;
    }
    i += 1;
  }
  return { ok: true, comments };
}
