// RTK port constants (mirror Rust defaults)
export const RAW_CAP = 10 * 1024 * 1024;
export const MIN_COMPRESS_SIZE = 500;
export const DETECT_WINDOW = 1024;
export const GIT_DIFF_HUNK_MAX_LINES = 100;
export const GIT_DIFF_CONTEXT_KEEP = 3;
export const GIT_LOG_MAX_LINES = 200;
export const DEDUP_LINE_MAX = 2000;
export const GREP_PER_FILE_MAX = 10;
export const FIND_PER_DIR_MAX = 10;
export const FIND_TOTAL_DIR_MAX = 20;
export const STATUS_MAX_FILES = 10;
export const STATUS_MAX_UNTRACKED = 10;
export const LS_EXT_SUMMARY_TOP = 5;
export const LS_NOISE_DIRS = [
  "node_modules", ".git", "target", "__pycache__",
  ".next", "dist", "build", ".cache", ".turbo",
  ".vercel", ".pytest_cache", ".mypy_cache", ".tox",
  ".venv", "venv",
  "env",
  "coverage", ".nyc_output", ".DS_Store", "Thumbs.db",
  ".idea", ".vscode", ".vs", "*.egg-info", ".eggs"
];
export const TREE_MAX_LINES = 200;
export const SEARCH_LIST_PER_DIR_MAX = 10;
export const SEARCH_LIST_TOTAL_DIR_MAX = 20;
export const SMART_TRUNCATE_HEAD = 120;
export const SMART_TRUNCATE_TAIL = 60;
export const SMART_TRUNCATE_MIN_LINES = 250;
export const READ_NUMBERED_MIN_HIT_RATIO = 0.7;

export const FILTERS = {
  GIT_DIFF: "git-diff",
  GIT_STATUS: "git-status",
  GIT_LOG: "git-log",
  GREP: "grep",
  FIND: "find",
  LS: "ls",
  TREE: "tree",
  DEDUP_LOG: "dedup-log",
  SMART_TRUNCATE: "smart-truncate",
  READ_NUMBERED: "read-numbered",
  SEARCH_LIST: "search-list",
  BUILD_OUTPUT: "build-output"
};

const LEVEL1 = [
  FILTERS.GREP, FILTERS.FIND, FILTERS.LS, FILTERS.DEDUP_LOG,
  FILTERS.SMART_TRUNCATE, FILTERS.READ_NUMBERED, FILTERS.SEARCH_LIST, FILTERS.BUILD_OUTPUT,
];
const LEVEL2 = [...LEVEL1, FILTERS.TREE];
const LEVEL3 = [...LEVEL2, FILTERS.GIT_DIFF, FILTERS.GIT_STATUS, FILTERS.GIT_LOG];

export const LEVEL_FILTERS = {
  1: new Set(LEVEL1),
  2: new Set(LEVEL2),
  3: new Set(LEVEL3),
};

export const DEFAULT_LEVEL = 3;

export function normalizeLevel(value) {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return DEFAULT_LEVEL;
}

export function levelAllows(level, filterName) {
  const set = LEVEL_FILTERS[normalizeLevel(level)];
  return set.has(filterName);
}
