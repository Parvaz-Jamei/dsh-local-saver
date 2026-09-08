const EXT = {
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "javascript", tsx: "javascript", mts: "javascript", cts: "javascript",
  py: "python", pyw: "python",
  c: "cfamily", h: "cfamily", cc: "cfamily", cpp: "cfamily", cxx: "cfamily",
  hpp: "cfamily", hh: "cfamily",
  java: "cfamily", cs: "cfamily", go: "cfamily", rs: "cfamily",
  swift: "cfamily", kt: "cfamily", kts: "cfamily",
  css: "cfamily", scss: "cfamily",
  html: "html", htm: "html", xml: "html",
  sh: "shell", bash: "shell", zsh: "shell",
};

function extFromText(text) {
  const m =
    String(text).match(/(?:^|\s)(?:[A-Za-z]:)?[^\s:]+\.([A-Za-z0-9]+)\b/) ||
    String(text).match(/\bfile['"]?\s*[:=]\s*['"][^'"]+\.([A-Za-z0-9]+)/i);
  if (!m) return null;
  return EXT[m[1].toLowerCase()] || null;
}

export function detectLanguage(text, toolName = "") {
  const src = String(text || "");
  const head = src.slice(0, 2500);
  const first = src.split(/\n/, 1)[0] || "";

  if (/^#!/.test(first)) {
    if (/\b(python3?|pypy)\b/i.test(first)) return "python";
    if (/\b(node|bun|deno|nodejs)\b/i.test(first)) return "javascript";
    if (/\b(bash|zsh|sh|ksh|dash)\b/i.test(first)) return "shell";
  }

  const byExt = extFromText(head);
  if (byExt) return byExt;

  const py = /(?:^|\n)(?:def |class |from \w+ import |import \w+|async def )/.test(head) && /:\s*(?:#|\n|$)/.test(head);
  const js = /(?:^|\n)(?:function |const |let |var |export |import )/.test(head) && /=>|;/.test(head);
  const cfam = /(?:^|\n)\s*(?:#include\b|package \w+|fn |func |public class )/.test(head);

  const hits = [];
  if (py) hits.push("python");
  if (js) hits.push("javascript");
  if (cfam) hits.push("cfamily");
  if (hits.length === 1) return hits[0];
  if (/<\s*(html|div|span|body|!DOCTYPE)/i.test(head) && /-->|<\/\w+>/.test(head)) return "html";
  if (/^#/.test(head) && /\b(echo|export |fi\b|then\b)/.test(head) && !py) return "shell";

  if (String(toolName) === "run_code" && js) return "javascript";
  return null;
}
