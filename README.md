# dsh-local-saver

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js)](https://nodejs.org/)
[![test](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml/badge.svg)](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml)

## Disclaimer

Independent, community-built utility. Not affiliated with, endorsed
by, or sponsored by DeepSeek or 9Router. 'DeepSeek' is a trademark of
its respective owner. Filter logic under rtk/ is a compatible
re-implementation ported under 9Router's MIT license — see NOTICE.

**Compression is lossy.** Filters drop repeated lines, listings, and
log noise. `aggressive` can drop source and diff hunks. Do not treat
stats as proof that answer quality is unchanged. For sensitive edits
stay on `coding-safe` or set `DSH_LOCAL_SAVER=off`.

Token figures in `local_saver_stats` are **approx chars/4**, not the
provider tokenizer and not billed usage. Persian, code, and JSON will
not match that ratio.

## What it does

Host-side interceptor on `tools/post-execute` (fallback:
`tool/post-execute`, `tools.after` — only one event is attached).
It does not read `~/.dsh/.credentials.yaml`, does not open sockets,
and does not sit in front of `api.deepseek.com`. It does not rewrite
files on disk.

If the hook is missing, `local_saver_stats` shows `hook_attached=false`
and a warning is printed. The plugin then does nothing.

## Modes

Default is `coding-safe`:

| Mode | Behavior |
|---|---|
| `coding-safe` | Keep source lines and diff hunks. Compact grep, ls, find, build logs. |
| `balanced` (`normal`) | Compress listings and build logs. Git follows `level`. |
| `aggressive` | Full RTK set at the current level. Highest risk of dropped context. |

```text
Use local_saver_toggle with mode coding-safe
Use local_saver_toggle with mode aggressive and level 3
Use local_saver_toggle with dry_run true
Use local_saver_stats
```

`dry_run` measures savings but leaves tool output unchanged.

There is no Settings React card (host-only on purpose). Status is the
system-prompt line + `local_saver_stats`.

## Install

```bash
dsh plugin --profile web add "github:Parvaz-Jamei/dsh-local-saver"
```

Restart the harness.

## Env

| Variable | Values | Default |
|---|---|---|
| `DSH_LOCAL_SAVER` | `off` / `0` / `false` | **on** |
| `DSH_LOCAL_SAVER_LEVEL` | `1` `2` `3` | `3` |
| `DSH_LOCAL_SAVER_MODE` | `coding-safe` `balanced`/`normal` `aggressive` | `coding-safe` |
| `DSH_LOCAL_SAVER_PERSIST` | `1` | off |
| `DSH_LOCAL_SAVER_CAVEMAN` | `1` | off |
| `DSH_LOCAL_SAVER_DRY_RUN` | `1` | off |
| `DSH_LOCAL_SAVER_STRIP_ANSI` | `0` / `off` | on for logs; skipped on coding-safe source |
| `DSH_SESSION` / `DSH_WORKSPACE` | any string | cache key scope (else `cwd`) |

Default stays **on** because the plugin exists to cut tool tokens.
Turn it off if you need raw output.

## Compatibility

Peer range is `@deepseek-ai/cordis` and `@deepseek-ai/dsh-tools`
`>=0.1.0-0` (developer-preview APIs move). Unit tests do not boot a
full DSH process. Re-verify the hook after a harness upgrade.

## Tests

```bash
node --test
```

Includes unit filters, review regressions, and a small lossy benchmark
fixture (`test/bench.test.js`). That bench is not a quality claim.

## Author

Parvaz Jamei  
Embedded software — industrial IoT and edge AI  
[github.com/Parvaz-Jamei](https://github.com/Parvaz-Jamei) · [proio.ir](https://proio.ir)

## Acknowledgments

rtk/ filter logic: ported from 9Router (github.com/decolua/9router),
MIT licensed.

## License

MIT. See `LICENSE` and `NOTICE`.
