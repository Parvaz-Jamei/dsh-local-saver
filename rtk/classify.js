import { splitGrepLine } from "./windowsPath.js";

const RE_GIT_DIFF = /^diff --git |^@@ /m;
const RE_GIT_META = /^On branch |^commit [0-9a-f]{7,40}$/m;
const RE_BUILD = /:\d+(?::\d+)?:\s+(?:fatal\s+)?error:|undefined reference|^npm (ERR!|error)|Traceback \(most recent call last\)|idf\.py|CMake Error|BUILD FAILED/im;
const RE_TREE = /[├└]──/;
const RE_LS = /^total \d+$|^[-dlbcps][rwx-]{9}/m;

export function classify(toolName, text) {
  const name = String(toolName || "");
  if (name === "read" || name === "read_file") return "source";
  const sample = String(text || "").slice(0, 8000);
  if (RE_GIT_DIFF.test(sample)) return "git-diff";
  if (RE_GIT_META.test(sample)) return "git-meta";
  if (RE_BUILD.test(sample)) return "build";
  const lines = sample.split("\n").filter((l) => l.trim());
  const first = lines.slice(0, 8);
  if (first.length && first.every((l) => splitGrepLine(l))) return "grep";
  if (RE_TREE.test(sample) || RE_LS.test(sample)) return "listing";
  if (name === "grep") return "grep";
  return "other";
}
