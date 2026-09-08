import { createState, parseCaveman, parsePersist, shrink, resolveToolName, resolveFilePath } from "./saver-core.js";
import { loadPersistedStats, savePersistedStats } from "./persist.js";
import { estimateTokens } from "./rtk/tokens.js";

export const name = "dsh-local-saver";
export const inject = ["tools"];

function defineTool(def) {
  return def;
}

const stats = {
  calls: 0,
  processed: 0,
  compressed: 0,
  saved: 0,
  charsBefore: 0,
  charsAfter: 0,
  lastTool: "",
  lastFilter: "",
  lastKind: "",
  lastCommentsSeen: 0,
  lastCommentsRemoved: 0,
  lastCommentsKept: 0,
  lastCommentsLang: "",
  hookAttached: false,
  hookEvent: "",
};
const state = createState();
let persistTimer = null;
let warnedHook = false;
const seenIds = new Set();

function snapshot() {
  return {
    enabled: state.enabled,
    level: state.level,
    mode: state.mode,
    dry_run: !!state.dryRun,
    strip_comments: state.stripComments === "preview" ? "preview" : !!state.stripComments,
    processed_calls: stats.processed,
    compressed_calls: stats.compressed,
    calls: stats.compressed,
    chars_before: stats.charsBefore,
    chars_after: stats.charsAfter,
    chars_saved: stats.saved,
    tokens_before: estimateTokens(stats.charsBefore),
    tokens_after: estimateTokens(stats.charsAfter),
    tokens_saved: estimateTokens(stats.saved),
    last_tool: stats.lastTool || "-",
    last_filter: stats.lastFilter || "-",
    last_kind: stats.lastKind || "-",
    comments_language: stats.lastCommentsLang || "-",
    comments_seen: stats.lastCommentsSeen,
    comments_removed: stats.lastCommentsRemoved,
    comments_kept: stats.lastCommentsKept,
    hook_attached: stats.hookAttached,
    hook_event: stats.hookEvent || "-",
    tokens_note: "approx chars/4 — not a provider tokenizer",
  };
}

function persistDebounced() {
  if (!parsePersist()) return;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    savePersistedStats(stats).catch(() => {});
  }, 2000);
}

const statsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean", required: true },
    level: { type: "number", required: true },
    mode: { type: "string", required: true },
    dry_run: { type: "boolean", required: true },
    strip_comments: { type: ["boolean", "string"], required: true },
    processed_calls: { type: "number", required: true },
    compressed_calls: { type: "number", required: true },
    calls: { type: "number", required: true },
    chars_before: { type: "number", required: true },
    chars_after: { type: "number", required: true },
    chars_saved: { type: "number", required: true },
    tokens_before: { type: "number", required: true },
    tokens_after: { type: "number", required: true },
    tokens_saved: { type: "number", required: true },
    last_tool: { type: "string", required: true },
    last_filter: { type: "string", required: true },
    last_kind: { type: "string", required: true },
    comments_language: { type: "string", required: true },
    comments_seen: { type: "number", required: true },
    comments_removed: { type: "number", required: true },
    comments_kept: { type: "number", required: true },
    hook_attached: { type: "boolean", required: true },
    hook_event: { type: "string", required: true },
    tokens_note: { type: "string", required: true },
  },
};

function renderStats(value) {
  return [
    {
      type: "text",
      text:
        `local-saver enabled=${value.enabled} level=${value.level} mode=${value.mode} dry_run=${value.dry_run} strip_comments=${value.strip_comments} hook=${value.hook_attached} event=${value.hook_event}\n` +
        `processed=${value.processed_calls} compressed=${value.compressed_calls}\n` +
        `comments lang=${value.comments_language} seen=${value.comments_seen} removed=${value.comments_removed} kept=${value.comments_kept}\n` +
        `Before: ${value.chars_before} chars (~${value.tokens_before} tokens approx chars/4)\n` +
        `After: ${value.chars_after} chars (~${value.tokens_after} tokens approx chars/4)\n` +
        `Saved: ${value.chars_saved} chars (~${value.tokens_saved} tokens approx chars/4)\n` +
        `last=${value.last_tool} kind=${value.last_kind} filter=${value.last_filter}`,
    },
  ];
}

export function apply(ctx) {
  if (parsePersist()) {
    loadPersistedStats()
      .then((loaded) => {
        stats.calls = loaded.calls;
        stats.compressed = loaded.calls || 0;
        stats.saved = loaded.saved;
        stats.charsBefore = loaded.charsBefore || 0;
        stats.charsAfter = loaded.charsAfter || 0;
      })
      .catch(() => {});
  }

  const statusLine = `local-saver ${state.enabled ? "ON" : "OFF"} mode=${state.mode} level=${state.level} strip_comments=${state.stripComments || "off"}. Compression may drop tool text. Tokens in stats are approx chars/4.`;
  if (ctx.systemPrompt && typeof ctx.systemPrompt.section === "function") {
    ctx.systemPrompt.section({ name: "local-saver-status", order: 40, text: statusLine });
    if (parseCaveman()) {
      ctx.systemPrompt.section({
        name: "local-saver-terse",
        order: 50,
        text: "Terse. No preamble. No restating the question. Prefer offsets/limits on read. Do not dump whole files. Keep exact code, paths, error lines.",
      });
    }
  } else if (state.enabled) {
    console.warn(`[dsh-local-saver] ${statusLine}`);
  }

  ctx.tools.register(
    defineTool({
      name: "local_saver_stats",
      description: "Show dsh-local-saver stats. Token counts are approx (chars/4), not provider usage. Local only.",
      parameters: {},
      output: { schema: statsSchema, render: (_a, v) => renderStats(v) },
      async execute() {
        return snapshot();
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "local_saver_toggle",
      description: "Set enabled, level 1-3, mode, dry_run, or strip_comments off|preview|on. Local only.",
      parameters: {
        enabled: { type: "boolean", description: "true = compress, false = raw." },
        level: { type: "number", description: "1 listings, 2 +tree, 3 +git." },
        mode: { type: "string", description: "coding-safe, balanced, or aggressive." },
        dry_run: { type: "boolean", description: "true = measure only, do not rewrite tool output." },
        strip_comments: {
          type: "string",
          description: "off | preview | on. Default off. preview reports counts without deleting.",
        },
      },
      output: { schema: statsSchema, render: (_a, v) => renderStats(v) },
      async execute(args) {
        if (typeof args?.enabled === "boolean") state.enabled = args.enabled;
        if (args?.level === 1 || args?.level === 2 || args?.level === 3) state.level = args.level;
        const mode = String(args?.mode ?? "").trim().toLowerCase();
        if (mode === "coding-safe" || mode === "aggressive") state.mode = mode;
        if (mode === "balanced" || mode === "normal") state.mode = "balanced";
        if (typeof args?.dry_run === "boolean") state.dryRun = args.dry_run;
        if (args?.strip_comments != null) {
          const sc = String(args.strip_comments).trim().toLowerCase();
          if (sc === "preview" || sc === "dry") state.stripComments = "preview";
          else if (sc === "on" || sc === "true" || sc === "1") state.stripComments = true;
          else state.stripComments = false;
        }
        return snapshot();
      },
    }),
  );

  const hook = async (payload, next) => {
    const incoming = payload == null ? "" : payload;
    const out = typeof next === "function" ? await next(incoming) : incoming;
    try {
      const id = payload && typeof payload === "object"
        ? payload.id || payload.toolCallId || payload.call_id || payload.tool_call_id
        : null;
      if (id) {
        const key = String(id);
        if (seenIds.has(key)) return out;
        seenIds.add(key);
        if (seenIds.size > 256) seenIds.delete(seenIds.values().next().value);
      }
      const toolName = resolveToolName(payload, out);
      const filePath = resolveFilePath(payload, out);
      const localState = filePath ? { ...state, filePath } : state;
      if (typeof out === "string") {
        const result = shrink(toolName, out, localState);
        record(result, toolName || "string");
        return result.saved > 0 && !state.dryRun ? result.value : out;
      }
      const slot =
        out && typeof out === "object"
          ? "result" in out
            ? "result"
            : "value" in out
              ? "value"
              : "content" in out
                ? "content"
                : null
          : null;
      if (!slot) return out;
      const result = shrink(toolName, out[slot], localState);
      record(result, toolName || slot);
      if (result.saved > 0 && !state.dryRun) return { ...out, [slot]: result.value };
    } catch {
      // never break the tool pipeline
    }
    return out;
  };

  function record(result, toolName) {
    if (result.processed || result.filter) {
      stats.processed += 1;
      stats.lastTool = String(toolName || "");
      stats.lastFilter = String(result.filter || "");
      stats.lastKind = String(result.kind || "");
      if (result.comments_seen != null) {
        stats.lastCommentsSeen = result.comments_seen;
        stats.lastCommentsRemoved = result.comments_removed || 0;
        stats.lastCommentsKept = result.comments_kept || 0;
        stats.lastCommentsLang = result.comments_language || "";
      }
    }
    if (result.saved > 0) {
      stats.calls += 1;
      stats.compressed += 1;
      stats.saved += result.saved;
      stats.charsBefore += result.chars_before || 0;
      stats.charsAfter += result.chars_after || 0;
      persistDebounced();
    }
  }

  if (typeof ctx.on === "function") {
    const primary = "tools/post-execute";
    const fallbacks = ["tool/post-execute", "tools.after"];
    try {
      ctx.on(primary, hook);
      stats.hookAttached = true;
      stats.hookEvent = primary;
    } catch {
      // fallbacks only if primary rejected
    }
    if (!stats.hookAttached) {
      for (const ev of fallbacks) {
        try {
          ctx.on(ev, hook);
          stats.hookAttached = true;
          stats.hookEvent = ev;
          break;
        } catch {
          // next
        }
      }
    }
  }
  if (!stats.hookAttached && !warnedHook) {
    warnedHook = true;
    console.warn("[dsh-local-saver] hook not attached; plugin idle. Check DSH tools/post-execute. local_saver_stats.hook_attached=false");
  }
}
