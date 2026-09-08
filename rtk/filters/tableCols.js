export function tableCols(input) {
  const lines = String(input).split("\n").filter((l) => l.trim());
  if (lines.length < 2) return input;
  const header = lines[0];
  const cols = header.trim().split(/\s{2,}|	/).filter(Boolean);
  if (cols.length < 2) return input;
  const keepIdx = cols
    .map((c, i) => ({ c: c.toUpperCase(), i }))
    .filter(({ c }) => /NAME|IMAGE|STATUS|READY|ID|PORT|AGE|RESTART|NAMESPACE|CONTAINER/.test(c))
    .map(({ i }) => i);
  const idx = keepIdx.length ? keepIdx : [0, 1, Math.min(2, cols.length - 1)];
  const fmt = (row) => {
    const parts = row.trim().split(/\s{2,}|	/).filter(Boolean);
    return idx.map((i) => parts[i] || "-").join("  ");
  };
  const out = [fmt(header)];
  for (const line of lines.slice(1, 41)) out.push(fmt(line));
  if (lines.length > 41) out.push(`... +${lines.length - 41} rows`);
  return out.join("\n");
}

tableCols.filterName = "table-cols";
