/** Collapse extra blank lines only. Never drop unique source lines. */
export function lightSource(input) {
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
  return out.join("\n");
}

lightSource.filterName = "light-source";
