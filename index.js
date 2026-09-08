import { defineTool } from "@deepseek-ai/dsh-tools";
import { createState, parseCaveman, parsePersist, shrink } from "./saver-core.js";
import { loadPersistedStats, savePersistedStats } from "./persist.js";
import { estimateTokens } from "./rtk/tokens.js";

export const name = "dsh-local-saver";
export const inject = ["tools"];

const stats = {
  calls: 0,
  saved: 0,
  charsBefore: 0,
  charsAfter: 0,
  lastTool: "",
  lastFilter: "",
  lastKind: "",
};
const state = createState();

function snapshot() {
  return {
    enabled: state.enabled,
    level: state.level,
    mode: state.mode,
    calls: stats.calls,
    chars_before: stats.charsBefore,
    chars_after: stats.charsAfter,
    chars_saved: stats.saved,
    tokens_before: estimateTokens(stats.charsBefore),
    tokens_after: estimateTokens(stats.charsAfter),
    tokens_saved: estimateTokens(stats.saved),
    last_tool: stats.lastTool || "-",
    last_filter: stats.lastFilter || "-",
    last_kind: stats.lastKind || "-",
  };
}

function persistBestEffort() {
  if (!parsePersist()) return;
  savePersistedStats({ calls: stats.calls, saved: stats.saved }).catch(() => {});
}

const statsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean", required: true },
    level: { type: "number", required: true },
    mode: { type: "string", required: true },
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
  },
};

function renderStats(value) {
  return [
    {
      type: "text",
      text:
        `local-saver enabled=${value.enabled} level=${value.level} mode=${value.mode}\n` +
        `Before: ${value.chars_before} chars (~${value.tokens_before} tokens)\n` +
        `After: ${value.chars_after} chars (~${value.tokens_after} tokens)\n` +
        `Saved: ${value.chars_saved} chars (~${value.tokens_saved} tokens)\n` +
        `last=${value.last_tool} kind=${value.last_kind} filter=${value.last_filter} calls=${value.calls}`,
    },
  ];
}

export function apply(ctx) {
  if (parsePersist()) {
    loadPersistedStats()
      .then((loaded) => {
        stats.calls = loaded.calls;
        stats.saved = loaded.saved;
      })
      .catch(() => {});
  }

  if (parseCaveman() && ctx.systemPrompt && typeof ctx.systemPrompt.section === "function") {
    ctx.systemPrompt.section({
      name: "local-saver-terse",
      order: 50,
      text: "Reply terse. Keep code, paths, errors exact. Drop filler.",
    });
  }

  ctx.tools.register(
    defineTool({
      name: "local_saver_stats",
      description: "Show dsh-local-saver stats including estimated tokens saved. Local only.",
      parameters: {},
      output: { schema: statsSchema, render: (_args, value) => renderStats(value) },
      async execute() {
        return snapshot();
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "local_saver_toggle",
      description:
        "Set enabled, level 1-3, or mode coding-safe|balanced|aggressive. coding-safe keeps source lines and diff hunks. Local only.",
      parameters: {
        enabled: { type: "boolean", description: "true = compress tool output, false = raw." },
        level: { type: "number", description: "1 listings only, 2 +tree, 3 +git (aggressive only)." },
        mode: { type: "string", description: "coding-safe, balanced, or aggressive." },
      },
      output: { schema: statsSchema, render: (_args, value) => renderStats(value) },
      async execute(args) {
        if (typeof args?.enabled === "boolean") state.enabled = args.enabled;
        if (args?.level === 1 || args?.level === 2 || args?.level === 3) state.level = args.level;
        const mode = String(args?.mode ?? "").trim().toLowerCase();
        if (mode === "coding-safe" || mode === "aggressive") state.mode = mode;
        if (mode === "balanced" || mode === "normal") state.mode = "balanced";
        return snapshot();
      },
    }),
  );

  const hook = async (payload, next) => {
    const out = typeof next === "function" ? await next(payload) : payload;
    try {
      const toolName = payload?.name || payload?.toolName || out?.name || "";
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
      const result = shrink(toolName, out[slot], state);
      if (result.saved > 0) {
        stats.calls += 1;
        stats.saved += result.saved;
        stats.charsBefore += result.chars_before || 0;
        stats.charsAfter += result.chars_after || 0;
        stats.lastTool = String(toolName || slot);
        stats.lastFilter = String(result.filter || "");
        stats.lastKind = String(result.kind || "");
        persistBestEffort();
        return { ...out, [slot]: result.value };
      }
    } catch {
      // never break the tool pipeline
    }
    return out;
  };

  if (typeof ctx.on === "function") {
    ctx.on("tools/post-execute", hook);
  }
}
