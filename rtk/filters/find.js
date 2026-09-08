import { FIND_PER_DIR_MAX, FIND_TOTAL_DIR_MAX, LS_NOISE_DIRS } from "../constants.js";

function isNoise(path) {
  const n = path.replace(/\\/g, "/");
  return LS_NOISE_DIRS.some((d) => d.includes("*") ? false : n.includes(`/${d}/`) || n.endsWith(`/${d}`) || n.includes(`/${d}`));
}

export function find(input) {
  const lines = input.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return input;
  const kept = [];
  let noise = 0;
  for (const path of lines) {
    if (isNoise(path)) noise += 1;
    else kept.push(path);
  }
  const byDir = new Map();
  for (const path of kept) {
    const lastSep = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
    let dir;
    let basename;
    if (lastSep === -1) {
      dir = ".";
      basename = path;
    } else {
      dir = path.slice(0, lastSep) || "/";
      basename = path.slice(lastSep + 1);
    }
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(basename);
  }
  const dirs = Array.from(byDir.keys()).sort();
  let out = `${kept.length} files in ${dirs.length} dirs`;
  if (noise) out += ` (${noise} noise paths omitted)`;
  out += ":\n\n";
  const showDirs = dirs.slice(0, FIND_TOTAL_DIR_MAX);
  for (const dir of showDirs) {
    const files = byDir.get(dir);
    const dirLabel = dir.replace(/\\/g, "/");
    out += `${dirLabel}/  (${files.length})\n`;
    const showFiles = files.slice(0, FIND_PER_DIR_MAX);
    for (const f of showFiles) out += `  ${f}\n`;
    if (files.length > FIND_PER_DIR_MAX) out += `  +${files.length - FIND_PER_DIR_MAX}\n`;
  }
  if (dirs.length > FIND_TOTAL_DIR_MAX) out += `\n+${dirs.length - FIND_TOTAL_DIR_MAX} more dirs\n`;
  return out;
}

find.filterName = "find";
