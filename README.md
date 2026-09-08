# dsh-local-saver

Local DeepSeek Harness plugin. Compresses long tool output before it is sent back to the model.

This is a host-side interceptor, not a proxy. It does not read `~/.dsh/.credentials.yaml`, does not open sockets, and does not sit in front of `api.deepseek.com`.

Filter logic under `rtk/` is a local JS port of the MIT RTK module from [9router](https://github.com/decolua/9router). The gateway, key store, and provider fallback from that project are intentionally not included.

## What it does

Hooks `tools/post-execute` and, for `bash` / `pwsh` / `grep` / `read` / `read_file` / `exec` / `run_code`, runs an autodetect + compact pipeline:

- git-diff / git-status / git-log
- grep / find / ls / tree
- build-output
- dedup-log / smart-truncate / read-numbered / search-list

Grep paths understand a Windows drive prefix (`C:\\...:12:line`). Errors are left alone. Blobs under 500 characters are left alone.

This is not a bill-cutter by itself. Peak/off-peak DeepSeek pricing and model routing stay in `docs/AGENTS.md`.

## Install

Copy the whole directory. `index.js` imports `saver-core.js` and `persist.js`.

```bash
dsh plugin --profile web add "/absolute/path/dsh-local-saver"
```

From this repository:

```bash
dsh plugin --profile web add "github:Parvaz-Jamei/dsh-local-saver"
```

Restart the harness. Keep the DeepSeek key on the official Settings → Models card.

## Env

| Variable | Values | Default |
|---|---|---|
| `DSH_LOCAL_SAVER` | `off` / `0` / `false` | on |
| `DSH_LOCAL_SAVER_LEVEL` | `1` `2` `3` | `3` |
| `DSH_LOCAL_SAVER_PERSIST` | `1` | off |
| `DSH_LOCAL_SAVER_CAVEMAN` | `1` | off |

Levels:

- 1 — grep, find, ls, dedup-log, smart-truncate, read-numbered, search-list, build-output
- 2 — + tree
- 3 — + git-diff, git-status, git-log

## Tools

- `local_saver_stats` — enabled, level, calls, chars_saved, last tool/filter
- `local_saver_toggle` — optional `enabled` and `level` for the current process

## Persist

Off by default. With `DSH_LOCAL_SAVER_PERSIST=1` the plugin writes only:

```json
{"calls":0,"saved":0}
```

to `$DSH_HOME/local-saver-stats.json` (usually `~/.dsh/local-saver-stats.json`). Tool text is never written.

## Caveman

`DSH_LOCAL_SAVER_CAVEMAN=1` is off by default.

This plugin attempts to use ctx.systemPrompt.section() if the harness exposes it, but this API is not confirmed against official dsh-tools docs — if it's absent, DSH_LOCAL_SAVER_CAVEMAN=1 silently does nothing (no crash, no output change). Check the official dsh-tools API reference to confirm before relying on this in production; until then, prefer writing terse style manually in your own system prompt/AGENTS.md.

## Tests

```bash
node --test test/*.test.js
```

## Author

Parvaz Jamei  
Embedded software — industrial IoT and edge AI  
[github.com/Parvaz-Jamei](https://github.com/Parvaz-Jamei) · [proio.ir](https://proio.ir)

## License

MIT. See `LICENSE` and `NOTICE`.
