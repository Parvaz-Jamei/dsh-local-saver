const TAG = /\b(TODO|FIXME|XXX|HACK|WARNING|WARN|NOTE|BUG|IMPORTANT)\b/i;
const KEEP_MARK = /~keep\b/i;
const DIRECTIVE =
  /(?:eslint|prettier|istanbul|c8|biome|oxlint|tslint|@ts-|@jsx|@vite|webpack|pragma|nolint|noqa|type:\s*ignore|fmt\.off|gofmt|prettier-ignore|eslint-disable|eslint-enable|stylelint|spdx|license|copyright|coveralls|codeql)/i;

export const KEEP_TAGS = ["TODO", "FIXME", "XXX", "HACK", "WARNING", "WARN", "NOTE", "BUG", "IMPORTANT"];

export function commentBody(value) {
  return String(value || "")
    .replace(/^<!--/, "")
    .replace(/-->$/, "")
    .replace(/^#+\s?/, "")
    .replace(/^\/\/[/!]?\s?/, "")
    .replace(/^\/\*+!?/, "")
    .replace(/\*+\/$/, "")
    .trim();
}

export function isDirective(body) {
  const t = commentBody(body);
  if (!t) return false;
  if (t.startsWith("@")) return true;
  if (/^[A-Za-z][\w.-]*\s*:/.test(t) && DIRECTIVE.test(t)) return true;
  return DIRECTIVE.test(t);
}

export function shouldKeepComment(comment) {
  const raw = comment.value || "";
  const body = commentBody(raw);
  if (comment.type === "doc" || comment.type === "docstring") return true;
  if (KEEP_MARK.test(raw) || TAG.test(body) || TAG.test(raw)) return true;
  if (isDirective(raw)) return true;
  return false;
}
