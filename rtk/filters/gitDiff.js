import { GIT_DIFF_HUNK_MAX_LINES } from "../constants.js";

export function gitDiff(diff, maxLines = 500, opts = {}) {
  const keepAll = opts.keepAll === true;
  const result = [];
  let currentFile = "";
  let added = 0;
  let removed = 0;
  let inHunk = false;
  let hunkShown = 0;
  let hunkSkipped = 0;
  let wasTruncated = false;
  let skipBinary = false;
  const maxHunkLines = keepAll ? Number.MAX_SAFE_INTEGER : GIT_DIFF_HUNK_MAX_LINES;
  const cap = keepAll ? Number.MAX_SAFE_INTEGER : maxLines;
  const lines = diff.split("\n");
  outer: for (const line of lines) {
    if (line.startsWith("diff --git")) {
      skipBinary = false;
      if (hunkSkipped > 0) {
        result.push(`  ... (${hunkSkipped} lines truncated)`);
        wasTruncated = true;
        hunkSkipped = 0;
      }
      if (currentFile && (added > 0 || removed > 0)) result.push(`  +${added} -${removed}`);
      const parts = line.split(" b/");
      currentFile = parts.length > 1 ? parts.slice(1).join(" b/") : "unknown";
      result.push(`\n${currentFile}`);
      added = 0;
      removed = 0;
      inHunk = false;
      hunkShown = 0;
    } else if (/^Binary files |^GIT binary patch/.test(line)) {
      result.push("  [binary omitted]");
      skipBinary = true;
      inHunk = false;
    } else if (skipBinary) {
      continue;
    } else if (line.startsWith("@@")) {
      if (hunkSkipped > 0) {
        result.push(`  ... (${hunkSkipped} lines truncated)`);
        wasTruncated = true;
        hunkSkipped = 0;
      }
      inHunk = true;
      hunkShown = 0;
      result.push(`  ${line}`);
    } else if (inHunk) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        added += 1;
        if (hunkShown < maxHunkLines) { result.push(`  ${line}`); hunkShown += 1; }
        else hunkSkipped += 1;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        removed += 1;
        if (hunkShown < maxHunkLines) { result.push(`  ${line}`); hunkShown += 1; }
        else hunkSkipped += 1;
      } else if (line.trim() === "") {
        continue;
      } else if (hunkShown < maxHunkLines && !line.startsWith("\\")) {
        if (hunkShown > 0) { result.push(`  ${line}`); hunkShown += 1; }
      }
    }
    if (result.length >= cap) {
      result.push("\n... (more changes truncated)");
      wasTruncated = true;
      break outer;
    }
  }
  if (hunkSkipped > 0) {
    result.push(`  ... (${hunkSkipped} lines truncated)`);
    wasTruncated = true;
  }
  if (currentFile && (added > 0 || removed > 0)) result.push(`  +${added} -${removed}`);
  if (wasTruncated) result.push("[full diff: rtk git diff --no-compact]");
  return result.join("\n");
}

gitDiff.filterName = "git-diff";
