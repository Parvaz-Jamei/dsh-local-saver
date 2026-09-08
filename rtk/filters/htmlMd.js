export function htmlMd(input) {
  let t = String(input);
  const headings = [];
  const errors = [];
  t.replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_, h) => {
    headings.push(h.replace(/<[^>]+>/g, "").trim());
    return "";
  });
  if (/<[a-z][\s\S]*>/i.test(t)) {
    t = t
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }
  for (const line of t.split(/(?<=[.!?])\s+|\n/)) {
    if (/error|exception|failed|fatal/i.test(line)) errors.push(line.trim().slice(0, 200));
  }
  const mdHead = t.split("\n").filter((l) => /^#{1,3}\s/.test(l.trim())).slice(0, 20);
  const parts = [];
  if (headings.length) parts.push(headings.slice(0, 12).map((h) => `## ${h}`).join("\n"));
  if (mdHead.length) parts.push(mdHead.join("\n"));
  if (errors.length) parts.push(errors.slice(0, 20).join("\n"));
  const body = t.slice(0, 2500);
  parts.push(body);
  return parts.join("\n");
}

htmlMd.filterName = "html-md";
