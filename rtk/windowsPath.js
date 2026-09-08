/** Windows drive-letter prefix: "C:\\..." or "C:/..." — first colon is not a grep delimiter. */
export const WIN_DRIVE_RE = /^[A-Za-z]:[\\/]/;

export function colonSearchStart(line) {
  return WIN_DRIVE_RE.test(line) ? 2 : 0;
}

/** splitn(3, ':') with Windows-drive awareness. Returns null if not file:line:content. */
export function splitGrepLine(line) {
  const start = colonSearchStart(line);
  const first = line.indexOf(":", start);
  if (first === -1) return null;
  const second = line.indexOf(":", first + 1);
  if (second === -1) return null;
  const file = line.slice(0, first);
  const lineNumStr = line.slice(first + 1, second);
  if (!/^\d+$/.test(lineNumStr)) return null;
  return { file, lineNumStr, content: line.slice(second + 1) };
}
