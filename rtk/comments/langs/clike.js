function isIdentStart(c) {
  return /[A-Za-z_]/.test(c);
}

function skipLine(s, i) {
  const n = s.length;
  while (i < n && s[i] !== "\n") i += 1;
  return i;
}

function scanQuoted(s, i, quote, { allowNl = false } = {}) {
  const n = s.length;
  let k = i + 1;
  while (k < n) {
    if (s[k] === "\\") {
      k += 2;
      continue;
    }
    if (s[k] === quote) return { end: k + 1 };
    if (s[k] === "\n" && !allowNl) return { error: "unclosed-string" };
    k += 1;
  }
  return { error: "unclosed-string" };
}

function scanCppRaw(s, i) {
  let k = i;
  if (s.startsWith("u8", k)) k += 2;
  else if (s[k] === "u" || s[k] === "U" || s[k] === "L") k += 1;
  if (s[k] !== "R" || s[k + 1] !== "\"") return null;
  k += 2;
  let delim = "";
  const n = s.length;
  while (k < n && s[k] !== "(") {
    if (/\s/.test(s[k]) || s[k] === "\\" || s[k] === ")") return null;
    delim += s[k];
    k += 1;
    if (delim.length > 16) return null;
  }
  if (s[k] !== "(") return null;
  k += 1;
  const close = `)${delim}"`;
  const hit = s.indexOf(close, k);
  if (hit < 0) return { error: "unclosed-raw-string" };
  return { end: hit + close.length };
}

function scanRustRaw(s, i) {
  let k = i;
  if (s[k] === "b" || s[k] === "c") k += 1;
  if (s[k] !== "r") return null;
  k += 1;
  let hashes = 0;
  while (s[k] === "#") {
    hashes += 1;
    k += 1;
    if (hashes > 255) return null;
  }
  if (s[k] !== "\"") return null;
  k += 1;
  const close = `"${"#".repeat(hashes)}`;
  const hit = s.indexOf(close, k);
  if (hit < 0) return { error: "unclosed-raw-string" };
  return { end: hit + close.length };
}

function scanHashQuoted(s, i, { tripleOk = true } = {}) {
  let k = i;
  let hashes = 0;
  while (s[k] === "#") {
    hashes += 1;
    k += 1;
    if (hashes > 16) return null;
  }
  if (s[k] !== "\"") return null;
  const triple = tripleOk && s[k + 1] === "\"" && s[k + 2] === "\"";
  k += triple ? 3 : 1;
  const close = `${triple ? "\"\"\"" : "\""}${"#".repeat(hashes)}`;
  if (hashes > 0) {
    const hit = s.indexOf(close, k);
    if (hit < 0) return { error: "unclosed-raw-string" };
    return { end: hit + close.length };
  }
  return null;
}

function scanTriple(s, i) {
  if (!(s[i] === "\"" && s[i + 1] === "\"" && s[i + 2] === "\"")) return null;
  const hit = s.indexOf("\"\"\"", i + 3);
  if (hit < 0) return { error: "unclosed-text-block" };
  return { end: hit + 3 };
}

function scanCsharpVerbatim(s, i) {
  if (s[i] !== "@" || s[i + 1] !== "\"") return null;
  const n = s.length;
  let k = i + 2;
  while (k < n) {
    if (s[k] === "\"" && s[k + 1] === "\"") {
      k += 2;
      continue;
    }
    if (s[k] === "\"") return { end: k + 1 };
    k += 1;
  }
  return { error: "unclosed-string" };
}

function scanGoRaw(s, i) {
  if (s[i] !== "`") return null;
  const hit = s.indexOf("`", i + 1);
  if (hit < 0) return { error: "unclosed-raw-string" };
  return { end: hit + 1 };
}

export function scanClike(src, options = {}) {
  const s = String(src);
  const n = s.length;
  const comments = [];
  const {
    javaTextBlock = false,
    cppRaw = false,
    rustRaw = false,
    kotlinTriple = false,
    swiftMulti = false,
    csharpRaw = false,
    goRaw = false,
  } = options;

  let i = 0;
  while (i < n) {
    const c = s[i];
    const d = s[i + 1];

    if (c === "/" && d === "/") {
      const start = i;
      i = skipLine(s, i + 2);
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

    if (cppRaw) {
      const raw = scanCppRaw(s, i);
      if (raw) {
        if (raw.error) return { ok: false, reason: raw.error };
        i = raw.end;
        continue;
      }
    }

    if (rustRaw) {
      const raw = scanRustRaw(s, i);
      if (raw) {
        if (raw.error) return { ok: false, reason: raw.error };
        i = raw.end;
        continue;
      }
    }

    if (csharpRaw) {
      const verb = scanCsharpVerbatim(s, i);
      if (verb) {
        if (verb.error) return { ok: false, reason: verb.error };
        i = verb.end;
        continue;
      }
    }

    if (swiftMulti) {
      const raw = scanHashQuoted(s, i, { tripleOk: true });
      if (raw) {
        if (raw.error) return { ok: false, reason: raw.error };
        i = raw.end;
        continue;
      }
    }

    if ((javaTextBlock || kotlinTriple || csharpRaw || swiftMulti) && c === "\"" && d === "\"" && s[i + 2] === "\"") {
      const block = scanTriple(s, i);
      if (block.error) return { ok: false, reason: block.error };
      i = block.end;
      continue;
    }

    if (goRaw && c === "`") {
      const raw = scanGoRaw(s, i);
      if (raw.error) return { ok: false, reason: raw.error };
      i = raw.end;
      continue;
    }

    if (c === "\"" || c === "'") {
      const q = scanQuoted(s, i, c, { allowNl: false });
      if (q.error) return { ok: false, reason: q.error };
      i = q.end;
      continue;
    }

    if (isIdentStart(c)) {
      i += 1;
      while (i < n && /[A-Za-z0-9_]/.test(s[i])) i += 1;
      continue;
    }

    i += 1;
  }

  return { ok: true, comments };
}

export function findJavaComments(src) {
  return scanClike(src, { javaTextBlock: true });
}
export function findCppComments(src) {
  return scanClike(src, { cppRaw: true });
}
export function findRustComments(src) {
  return scanClike(src, { rustRaw: true });
}
export function findKotlinComments(src) {
  return scanClike(src, { kotlinTriple: true });
}
export function findSwiftComments(src) {
  return scanClike(src, { swiftMulti: true });
}
export function findCsharpComments(src) {
  return scanClike(src, { csharpRaw: true });
}
export function findGoComments(src) {
  return scanClike(src, { goRaw: true });
}
export function findCFamilyComments(src) {
  return scanClike(src, { cppRaw: true, goRaw: true });
}
