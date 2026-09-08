import {
  DETECT_WINDOW,
  READ_NUMBERED_MIN_HIT_RATIO,
  SMART_TRUNCATE_MIN_LINES,
  DEFAULT_LEVEL,
  normalizeLevel,
  levelAllows,
} from "./constants.js";
import { splitGrepLine } from "./windowsPath.js";
import { gitDiff } from "./filters/gitDiff.js";
import { gitStatus } from "./filters/gitStatus.js";
import { gitLog } from "./filters/gitLog.js";
import { buildOutput } from "./filters/buildOutput.js";
import { grep } from "./filters/grep.js";
import { find } from "./filters/find.js";
import { dedupLog } from "./filters/dedupLog.js";
import { ls } from "./filters/ls.js";
import { tree } from "./filters/tree.js";
import { smartTruncate } from "./filters/smartTruncate.js";
import { readNumbered, READ_NUMBERED_LINE_RE } from "./filters/readNumbered.js";
import { searchList, SEARCH_LIST_HEADER_RE } from "./filters/searchList.js";
import { testRunner } from "./filters/testRunner.js";
import { tableCols } from "./filters/tableCols.js";
import { jsonCompact, looksLikeJson } from "./filters/jsonCompact.js";
import { htmlMd } from "./filters/htmlMd.js";

const RE_GIT_DIFF = /^diff --git /m;
const RE_GIT_DIFF_HUNK = /^@@ /m;
const RE_GIT_STATUS = /^On branch |^nothing to commit|^Changes (not |to be )|^Untracked files:/m;
const RE_GIT_LOG = /^[*|/\\ ]*commit [0-9a-f]{7,40}$/m;
const RE_PORCELAIN = /^[ MADRCU?!][ MADRCU?!] \S/m;
const RE_BUILD_OUTPUT = /^(npm (warn|error|ERR!)|yarn (warn|error)|\[ERROR\]|BUILD (SUCCESS|FAILED)|ERROR:|Successfully (installed|built)|added \d+ package)|:\d+(?::\d+)?:\s+(?:fatal\s+)?error:|undefined reference|idf\.py|CMake Error/im;
const RE_TEST = /===== test session|test result:|FAIL: |cargo test|Ran \d+ tests|npm test|go test|ok \d+    /i;
const RE_TABLE = /CONTAINER ID|^NAME\s+READY\s+STATUS|^NAMESPACE\s+NAME/m;
const RE_TREE_GLYPH = /[├└]──|│  /;
const RE_LS_ROW = /^[-dlbcps][rwx-]{9}/m;
const RE_LS_TOTAL = /^total \d+$/m;

export function autoDetectFilter(text, level = DEFAULT_LEVEL) {
  const allowed = (fn) => {
    const name = fn.filterName || fn.name;
    return levelAllows(normalizeLevel(level), name) ? fn : null;
  };

  const head = text.length > DETECT_WINDOW ? text.slice(0, DETECT_WINDOW) : text;

  if (RE_GIT_DIFF.test(head) || RE_GIT_DIFF.test(text.slice(0, 8000)) || RE_GIT_DIFF_HUNK.test(head)) {
    const hit = allowed(gitDiff);
    if (hit) return hit;
  }
  if (RE_GIT_LOG.test(head)) {
    const hit = allowed(gitLog);
    if (hit) return hit;
  }
  if (RE_GIT_STATUS.test(head)) {
    const hit = allowed(gitStatus);
    if (hit) return hit;
  }
  if (RE_TEST.test(head) || RE_TEST.test(text.slice(0, 4000))) {
    const hit = allowed(testRunner);
    if (hit) return hit;
  }
  if (RE_BUILD_OUTPUT.test(head) || RE_BUILD_OUTPUT.test(text.slice(0, 8000))) {
    const hit = allowed(buildOutput);
    if (hit) return hit;
  }
  if (RE_TABLE.test(head)) {
    const hit = allowed(tableCols);
    if (hit) return hit;
  }
  if (looksLikeJson(text)) {
    const hit = allowed(jsonCompact);
    if (hit) return hit;
  }
  if (/<(html|div|p|span|article|h[1-3])[\s>]/i.test(head)) {
    const hit = allowed(htmlMd);
    if (hit) return hit;
  }
  if (isMostlyPorcelain(head)) {
    const hit = allowed(gitStatus);
    if (hit) return hit;
  }

  const lines = head.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const first5 = nonEmpty.slice(0, 5);
  if (first5.some(isGrepLine)) {
    const hit = allowed(grep);
    if (hit) return hit;
  }
  if (nonEmpty.length >= 3 && nonEmpty.every(isPathLike)) {
    const hit = allowed(find);
    if (hit) return hit;
  }
  if (RE_TREE_GLYPH.test(head)) {
    const hit = allowed(tree);
    if (hit) return hit;
  }
  if (RE_LS_TOTAL.test(head) || countMatches(head, RE_LS_ROW) >= 3) {
    const hit = allowed(ls);
    if (hit) return hit;
  }
  if (SEARCH_LIST_HEADER_RE.test(head)) {
    const hit = allowed(searchList);
    if (hit) return hit;
  }
  if (lines.length >= SMART_TRUNCATE_MIN_LINES && isLineNumbered(lines)) {
    const hit = allowed(readNumbered);
    if (hit) return hit;
  }
  if (nonEmpty.length >= 5) {
    const hit = allowed(dedupLog);
    if (hit) return hit;
  }
  if (text.split("\n").length >= SMART_TRUNCATE_MIN_LINES) {
    const hit = allowed(smartTruncate);
    if (hit) return hit;
  }
  return null;
}

export function isGrepLine(line) {
  return splitGrepLine(line) != null;
}

function isPathLike(line) {
  const t = line.trim();
  if (t.length === 0) return false;
  if (/^[A-Za-z]:[\\/]/.test(t)) return true;
  if (t.includes(":")) return false;
  return t.startsWith(".") || t.startsWith("/") || t.includes("/");
}

function isMostlyPorcelain(head) {
  const lines = head.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return false;
  const hits = lines.filter((l) => RE_PORCELAIN.test(l)).length;
  return hits / lines.length >= 0.6;
}

function isLineNumbered(lines) {
  let hits = 0;
  let nonEmpty = 0;
  const sample = lines.slice(0, 100);
  for (const l of sample) {
    if (l.length === 0) continue;
    nonEmpty++;
    if (READ_NUMBERED_LINE_RE.test(l)) hits++;
  }
  if (nonEmpty < 5) return false;
  return hits / nonEmpty >= READ_NUMBERED_MIN_HIT_RATIO;
}

function countMatches(text, re) {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return (text.match(g) || []).length;
}

export { READ_NUMBERED_LINE_RE } from "./filters/readNumbered.js";
export { SEARCH_LIST_HEADER_RE } from "./filters/searchList.js";
