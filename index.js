import { defineTool } from "@deepseek-ai/dsh-tools";
import { createState, parseCaveman, parsePersist, shrink } from "./saver-core.js";
import { loadPersistedStats, savePersistedStats } from "./persist.js";

export const name = "dsh-local-saver";
export const inject = ["tools"];

const stats = { calls: 0, saved: 0, lastTool: "", lastFilter: "" };
const state = createState();

function snapshot() {
  return {
    enabled: state.enabled,
    level: state.level,
    mode: state.mode,
    calls: stats.calls,
    chars_saved: stats.saved,
    last_tool: stats.lastTool || "-",
    last_filter: stats.lastFilter || "-",
  };
}

function persistBestEffort() {
  if (!parsePersist()) return;
  savePersistedStats(stats).catch(() => {});
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
      description:
        "Show dsh-local-saver stats and current settings. Local only: does not read API keys and does not use the network.",
      parameters: {},
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean", required: true },
            level: { type: "number", required: true },
            mode: { type: "string", required: true },
            calls: { type: "number", required: true },
            chars_saved: { type: "number", required: true },
            last_tool: { type: "string", required: true },
            last_filter: { type: "string", required: true },
          },
        },
        render: (_args, value) => [
          {
            type: "text",
            text: `local-saver enabled=${value.enabled} level=${value.level} mode=${value.mode} calls=${value.calls} chars_saved=${value.chars_saved} last=${value.last_tool} filter=${value.last_filter}`,
          },
        ],
      },
      async execute() {
        return snapshot();
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: "local_saver_toggle",
      description:
        "Enable/disable local tool-output compression, set level 1/2/3, or set mode coding-safe|normal|aggressive for this session. Use coding-safe when editing source (keeps read_file and git diff raw). Local only.",
      parameters: {
        enabled: {
          type: "boolean",
          description: "true = compress tool output, false = pass through raw.",
        },
        level: {
          type: "number",
          description: "Compression level 1 (no tree/git), 2 (+tree), or 3 (+git). Default 3.",
        },
        mode: {
          type: "string",
          description: "coding-safe (default, keep source and diffs), normal, or aggressive.",
        },
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            enabled: { type: "boolean", required: true },
            level: { type: "number", required: true },
            mode: { type: "string", required: true },
            calls: { type: "number", required: true },
            chars_saved: { type: "number", required: true },
            last_tool: { type: "string", required: true },
            last_filter: { type: "string", required: true },
          },
        },
        render: (_args, value) => [
          {
            type: "text",
            text: `local-saver now enabled=${value.enabled} level=${value.level} mode=${value.mode}`,
          },
        ],
      },
      async execute(args) {
        if (typeof args?.enabled === "boolean") state.enabled = args.enabled;
        if (args?.level === 1 || args?.level === 2 || args?.level === 3) {
          state.level = args.level;
        }
        const mode = String(args?.mode ?? "").trim().toLowerCase();
        if (mode === "coding-safe" || mode === "normal" || mode === "aggressive") {
          state.mode = mode;
        }
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
      const { value, saved, filter } = shrink(toolName, out[slot], state);
      if (saved > 0) {
        stats.calls += 1;
        stats.saved += saved;
        stats.lastTool = String(toolName || slot);
        stats.lastFilter = String(filter || "");
        persistBestEffort();
        return { ...out, [slot]: value };
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
