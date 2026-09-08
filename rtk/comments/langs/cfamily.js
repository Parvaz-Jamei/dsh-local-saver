export function findCFamilyComments(src) {
  const s = String(src);
  const n = s.length;
  const comments = [];
  let i = 0;

  while (i < n) {
    const c = s[i];
    const d = s[i + 1];

    if (c === "/" && d === "/") {
      const start = i;
      i += 2;
      while (i < n && s[i] !== "\n") i += 1;
      const value = s.slice(start, i);
      const type = /^\s*\/\/[/!]/.test(value) ? "doc" : "line";
      comments.push({ start, end: i, type, value });
      continue;
    }

    if (c === "/" && d === "*") {
      const start = i;
      i += 2;
      while (i + 1 < n && !(s[i] === "*" && s[i + 1] === "/")) i += 1;
      if (i + 1 >= n) return { ok: false, reason: "unclosed-block-comment" };
      i += 2;
      const value = s.slice(start, i);
      const type = /^\/\*[\*!]/.test(value) ? "doc" : "block";
      comments.push({ start, end: i, type, value });
      continue;
    }

    if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === q) {
          i += 1;
          break;
        }
        if (s[i] === "\n" && q === "'") return { ok: false, reason: "unclosed-char" };
        i += 1;
      }
      continue;
    }

    if (c === "`") {
      i += 1;
      while (i < n && s[i] !== "`") {
        if (s[i] === "\\") i += 1;
        i += 1;
      }
      if (i >= n) return { ok: false, reason: "unclosed-raw-string" };
      i += 1;
      continue;
    }

    if ((c === "R" || c === "r") && d === '"') {
      i += 2;
      let delim = "";
      while (i < n && s[i] !== "(") {
        delim += s[i];
        i += 1;
      }
      if (s[i] === "(") i += 1;
      const close = `)${delim}"`;
      const hit = s.indexOf(close, i);
      if (hit < 0) return { ok: false, reason: "unclosed-raw-string" };
      i = hit + close.length;
      continue;
    }

    i += 1;
  }

  return { ok: true, comments };
}
