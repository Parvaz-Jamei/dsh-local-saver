const PRE_REGEX = new Set([
  "bos", "punct", "kw",
]);
const KW_REGEX = /^(?:return|throw|case|new|delete|void|typeof|in|of|instanceof|yield|await|else|do)$/;

function isIdStart(c) {
  return /[A-Za-z_$]/.test(c);
}
function isIdPart(c) {
  return /[A-Za-z0-9_$]/.test(c);
}

export function findJsComments(src) {
  const s = String(src);
  const n = s.length;
  const comments = [];
  let i = 0;
  let last = "bos";
  let tmpl = 0;

  if (s.startsWith("#!")) {
    while (i < n && s[i] !== "\n") i++;
    last = "punct";
  }

  while (i < n) {
    const c = s[i];
    const d = s[i + 1];

    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      i += 1;
      continue;
    }

    if (c === "/" && d === "/") {
      const start = i;
      i += 2;
      while (i < n && s[i] !== "\n") i += 1;
      const value = s.slice(start, i);
      const type = /^\s*\/\/\//.test(value) ? "doc" : "line";
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
      const type = /^\/\*\*/.test(value) ? "doc" : "block";
      comments.push({ start, end: i, type, value });
      continue;
    }

    if (c === "/" && PRE_REGEX.has(last)) {
      i += 1;
      let cls = false;
      let closed = false;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === "[" ) cls = true;
        else if (s[i] === "]" ) cls = false;
        else if (s[i] === "\n") return { ok: false, reason: "unclosed-regex" };
        else if (s[i] === "/" && !cls) {
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) return { ok: false, reason: "unclosed-regex" };
      while (i < n && /[a-z]/i.test(s[i])) i += 1;
      last = "atom";
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
        if (s[i] === "\n") return { ok: false, reason: "unclosed-string" };
        i += 1;
      }
      last = "atom";
      continue;
    }

    if (c === "`") {
      i += 1;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === "`") {
          i += 1;
          break;
        }
        if (s[i] === "$" && s[i + 1] === "{") {
          tmpl += 1;
          i += 2;
          last = "punct";
          break;
        }
        i += 1;
      }
      if (tmpl === 0) last = "atom";
      continue;
    }

    if (c === "}" && tmpl > 0) {
      tmpl -= 1;
      i += 1;
      while (i < n) {
        if (s[i] === "\\") {
          i += 2;
          continue;
        }
        if (s[i] === "`") {
          i += 1;
          last = "atom";
          break;
        }
        if (s[i] === "$" && s[i + 1] === "{") {
          tmpl += 1;
          i += 2;
          last = "punct";
          break;
        }
        i += 1;
      }
      continue;
    }

    if (isIdStart(c)) {
      let j = i + 1;
      while (j < n && isIdPart(s[j])) j += 1;
      const word = s.slice(i, j);
      i = j;
      last = KW_REGEX.test(word) ? "kw" : "atom";
      continue;
    }

    if (c >= "0" && c <= "9") {
      i += 1;
      while (i < n && /[0-9_.xa-fA-Fn]/i.test(s[i])) i += 1;
      last = "atom";
      continue;
    }

    if ((c === "+" && d === "+") || (c === "-" && d === "-") || (c === "=" && d === ">")) {
      i += 2;
      last = "atom";
      continue;
    }

    i += 1;
    last = "punct";
  }

  return { ok: true, comments };
}
