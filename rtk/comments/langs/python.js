const PREFIX = /^(?:r|u|R|U|f|F|b|B|fr|Fr|fR|FR|rf|Rf|rF|RF|br|Br|bR|BR|rb|Rb|rB|RB)/;

function readString(s, i) {
  const n = s.length;
  let k = i;
  const pre = s.slice(k, k + 2);
  if (PREFIX.test(s.slice(k, k + 2)) && (s[k + 2] === "'" || s[k + 2] === '"')) {
    k += pre.length === 2 && PREFIX.test(pre) ? 2 : 1;
  } else if (PREFIX.test(s[k]) && (s[k + 1] === "'" || s[k + 1] === '"')) {
    k += 1;
  }
  const q = s[k];
  if (q !== "'" && q !== '"') return null;
  const triple = s[k + 1] === q && s[k + 2] === q;
  k += triple ? 3 : 1;
  while (k < n) {
    if (s[k] === "\\") {
      k += 2;
      continue;
    }
    if (triple) {
      if (s[k] === q && s[k + 1] === q && s[k + 2] === q) return k + 3;
      k += 1;
      continue;
    }
    if (s[k] === q) return k + 1;
    if (s[k] === "\n") return null;
    k += 1;
  }
  return null;
}

export function findPythonComments(src) {
  const s = String(src);
  const n = s.length;
  const comments = [];
  let i = 0;
  let atStmt = true;
  let implicit = 0;

  while (i < n) {
    const c = s[i];

    if (c === " " || c === "\t" || c === "\r") {
      i += 1;
      continue;
    }
    if (c === "\n") {
      if (implicit === 0) atStmt = true;
      i += 1;
      continue;
    }
    if (c === "\\" && s[i + 1] === "\n") {
      i += 2;
      continue;
    }

    if (c === "#") {
      const start = i;
      while (i < n && s[i] !== "\n") i += 1;
      comments.push({ start, end: i, type: "line", value: s.slice(start, i) });
      continue;
    }

    if (c === "'" || c === '"' || (PREFIX.test(c) && /['"]/.test(s.slice(i, i + 4)))) {
      const end = readString(s, i);
      if (end == null) return { ok: false, reason: "unclosed-string" };
      const value = s.slice(i, end);
      const quote = value.includes('"""') || value.includes("'''");
      if (atStmt && quote) {
        comments.push({ start: i, end, type: "docstring", value });
      }
      i = end;
      atStmt = false;
      continue;
    }

    if (c === "(" || c === "[" || c === "{") {
      implicit += 1;
      i += 1;
      atStmt = false;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      if (implicit > 0) implicit -= 1;
      i += 1;
      atStmt = false;
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      while (i < n && /[A-Za-z0-9_]/.test(s[i])) i += 1;
      atStmt = false;
      continue;
    }

    i += 1;
    atStmt = false;
  }

  return { ok: true, comments };
}
