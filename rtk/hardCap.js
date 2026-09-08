export function windowText(input, headLines, tailLines, notice) {
  const lines = String(input).split("\n");
  if (lines.length <= headLines + tailLines) return String(input);
  const cut = lines.length - headLines - tailLines;
  return [
    ...lines.slice(0, headLines),
    notice || `... +${cut} lines omitted. Re-read with offset/limit.`,
    ...lines.slice(lines.length - tailLines),
  ].join("\n");
}

export function hardCapChars(input, maxChars) {
  const text = String(input);
  if (text.length <= maxChars) return text;
  const keep = Math.floor(maxChars / 2) - 40;
  return `${text.slice(0, keep)}\n... [truncated ${text.length - maxChars} chars]\n${text.slice(-keep)}`;
}
