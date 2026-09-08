/** Rough OpenAI-style estimate: ~4 chars per token. */
export function estimateTokens(chars) {
  const n = Number(chars) || 0;
  return Math.max(0, Math.round(n / 4));
}

export function tokenReport(beforeChars, afterChars) {
  const before = Math.max(0, Number(beforeChars) || 0);
  const after = Math.max(0, Number(afterChars) || 0);
  return {
    chars_before: before,
    chars_after: after,
    chars_saved: Math.max(0, before - after),
    tokens_before: estimateTokens(before),
    tokens_after: estimateTokens(after),
    tokens_saved: estimateTokens(Math.max(0, before - after)),
  };
}
