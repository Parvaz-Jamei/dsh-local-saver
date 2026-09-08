# dsh-local-saver

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js)](https://nodejs.org/)
[![test](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml/badge.svg)](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml)

## Disclaimer

Independent, community-built utility. Not affiliated with, endorsed
by, or sponsored by DeepSeek or 9Router. 'DeepSeek' is a trademark of
its respective owner. Filter logic under rtk/ is a compatible
re-implementation ported under 9Router's MIT license — see NOTICE.

Local DeepSeek Harness plugin. It compresses long tool output before that text is sent back to the model.

This is a host-side interceptor. It does not read `~/.dsh/.credentials.yaml`, does not open sockets, and does not sit in front of `api.deepseek.com`.

## What it does

Hooks `tools/post-execute` for `bash` / `pwsh` / `grep` / `read` / `read_file` / `exec` / `run_code` and runs autodetect + compact:

- git-diff / git-status / git-log
- grep / find / ls / tree
- build-output
- dedup-log / smart-truncate / read-numbered / search-list

Windows grep paths (`C:\\...:12:line`) are parsed correctly. Error blobs and outputs under 500 characters pass through unchanged.

Use `docs/AGENTS.md` for peak/off-peak scheduling and model routing. This plugin handles tool-output size.

## Platform support

Tested on Linux and macOS (POSIX paths, `~/.dsh`) and Windows
(drive-letter paths, `C:\...`). `$DSH_HOME` / `$HOME` resolution uses
Node's `os.homedir()`, which is cross-platform. No shell-specific
syntax is used anywhere in the plugin.

## Install

```bash
dsh plugin --profile web add "/absolute/path/dsh-local-saver"
# or
dsh plugin --profile web add "github:Parvaz-Jamei/dsh-local-saver"
```

Restart the harness. Keep the DeepSeek key on Settings → Models.

## Env

| Variable | Values | Default |
|---|---|---|
| `DSH_LOCAL_SAVER` | `off` / `0` / `false` | on |
| `DSH_LOCAL_SAVER_LEVEL` | `1` `2` `3` | `3` |
| `DSH_LOCAL_SAVER_PERSIST` | `1` | off |
| `DSH_LOCAL_SAVER_CAVEMAN` | `1` | off |

## Levels

- 1 — grep, find, ls, dedup-log, smart-truncate, read-numbered, search-list, build-output
- 2 — + tree
- 3 — + git-diff, git-status, git-log

## Tools

- `local_saver_stats` — enabled, level, calls, chars_saved, last tool/filter
- `local_saver_toggle` — `enabled` and `level` for this process

## Persist

Off unless `DSH_LOCAL_SAVER_PERSIST=1`. Then only `{"calls":N,"saved":N}` is written to `$DSH_HOME/local-saver-stats.json`. Tool text is never stored.

## Caveman

`DSH_LOCAL_SAVER_CAVEMAN=1` registers a short terse section when `ctx.systemPrompt.section()` exists. If the harness does not expose that method, the flag is a no-op.

## Tests

```bash
node --test test/*.test.js
```

## Author

Parvaz Jamei  
Embedded software — industrial IoT and edge AI  
[github.com/Parvaz-Jamei](https://github.com/Parvaz-Jamei) · [proio.ir](https://proio.ir)

## Acknowledgments

rtk/ filter logic: ported from 9Router (github.com/decolua/9router),
MIT licensed. This project is not a fork and does not include
9Router's gateway, provider routing, or key storage.

## License

MIT. See `LICENSE` and `NOTICE`.
