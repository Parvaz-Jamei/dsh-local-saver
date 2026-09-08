import { windowText } from "../hardCap.js";

export function lightSource(input, opts = {}) {
  const lines = String(input).split("\n");
  const out = [];
  let blanks = 0;
  for (const line of lines) {
    if (line.trim() === "") {
      blanks += 1;
      if (blanks <= 1) out.push(line);
      continue;
    }
    blanks = 0;
    out.push(line);
  }
  let text = out.join("\n");
  const maxKeep = opts.maxKeep ?? 400;
  if (out.length > maxKeep) {
    text = windowText(text, opts.head ?? 200, opts.tail ?? 80);
  }
  return text;
}

lightSource.filterName = "light-source";
