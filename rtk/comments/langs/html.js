export function findHtmlComments(src) {
  const s = String(src);
  const comments = [];
  let i = 0;
  const n = s.length;
  while (i < n) {
    const start = s.indexOf("<!--", i);
    if (start < 0) break;
    const endTok = s.indexOf("-->", start + 4);
    if (endTok < 0) return { ok: false, reason: "unclosed-html-comment" };
    const end = endTok + 3;
    comments.push({ start, end, type: "block", value: s.slice(start, end) });
    i = end;
  }
  return { ok: true, comments };
}
