# dsh-local-saver

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js)](https://nodejs.org/)
[![test](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml/badge.svg)](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/release/Parvaz-Jamei/dsh-local-saver)](https://github.com/Parvaz-Jamei/dsh-local-saver/releases)

Local tool-output compressor for [DeepSeek Harness](https://github.com/deepseek-ai/dsh).
No proxy, no network calls, no credential access.

Current version: **0.6.2**

## Disclaimer

Independent, community-built utility. Not affiliated with, endorsed
by, or sponsored by DeepSeek or 9Router. Filter logic under `rtk/` is a
compatible re-implementation ported under 9Router's MIT license.

**Compression is lossy.** Comment stripping is also lossy and **off by default**.

Token figures in `local_saver_stats` are **approx chars/4**, not a provider tokenizer.

## What it does

Attaches to `tools/post-execute` and shrinks large tool results before they
enter the model context:

- listings, grep, git status/log, test/build logs
- JSON compact
- coding-safe source windowing (default mode)
- optional comment stripping on `read` / `read_file` only

Write / edit / apply_patch outputs are never rewritten.

## Install

```bash
dsh plugin --profile web add "github:Parvaz-Jamei/dsh-local-saver"
```

Local copy: see `INSTALL.txt`. After add or upgrade, fully quit the harness
and reopen it.

Check the hook:

```text
Use local_saver_stats
```

`hook_attached` should be `true`.

## Modes

| Mode | Behavior |
|---|---|
| `coding-safe` (default) | Keep source and diff tails. Safer for coding. |
| `balanced` | More compression on listings and logs. |
| `aggressive` | Strongest cut. Can drop useful source text. |

```text
Use local_saver_toggle with mode coding-safe
Use local_saver_toggle with dry_run true
```

## Strip comments (off by default)

Not a generic `//` regex. Each supported language has its own scanner.
Unknown language, ambiguous guess, or unclosed string/comment → **no deletion**.

Applies only to `read` / `read_file`. Never on `write`, `edit`,
`apply_patch`, `bash`, or git diffs.

### Supported scanners

- JavaScript / TypeScript — strings, templates, regex literals
- Python — prefixes, triple quotes, docstrings
- Java — including text blocks `"""`
- C / C++ — including raw strings `R"delim(... )delim"`
- Rust — raw strings `r#"..."#`
- Kotlin / Swift — multiline and raw strings
- C# — verbatim `@""` and raw `"""`
- Go — raw backticks
- HTML / XML comments, shell `#`

Not supported (no-op): PHP, Ruby, Lua, SQL, Dart, Scala, Haskell, Elixir, …

Language comes from the tool payload path/extension first, then shebang,
then a single unambiguous content guess. A mention like `example.py`
inside another file does not select Python.

Kept by default: `TODO` `FIXME` `XXX` `HACK` `WARNING` `NOTE` `BUG`
`~keep`, JSDoc/Javadoc `/**`, `///` `//!`, Python docstrings, lint directives.

Scanner order for C-like languages: raw/multiline strings first, then `//`,
then `/* ... */`. Unclosed `/*` aborts the whole strip.

### Enable safely

```text
Use local_saver_toggle with strip_comments preview
Use local_saver_stats
```

Stats show `strip_comments`, `comments_language`, `comments_seen`,
`comments_removed`, `comments_kept`. Preview does not rewrite.

If the counts look right:

```text
Use local_saver_toggle with strip_comments on
```

Or env: `DSH_LOCAL_SAVER_STRIP_COMMENTS=preview` then `on`.

## Env

| Variable | Values | Default |
|---|---|---|
| `DSH_LOCAL_SAVER` | `off` / `0` / `false` | **on** |
| `DSH_LOCAL_SAVER_LEVEL` | `1` `2` `3` | `3` |
| `DSH_LOCAL_SAVER_MODE` | `coding-safe` `balanced` `aggressive` | `coding-safe` |
| `DSH_LOCAL_SAVER_STRIP_COMMENTS` | `off` / `preview` / `on` | **off** |
| `DSH_LOCAL_SAVER_DRY_RUN` | `1` | off |
| `DSH_LOCAL_SAVER_STRIP_ANSI` | `0` to keep ANSI | on |
| `DSH_LOCAL_SAVER_PERSIST` | `1` | off |
| `DSH_SESSION` / `DSH_WORKSPACE` | any string | cache scope |

## Tools

- `local_saver_stats` — counters, last filter, comment preview counts
- `local_saver_toggle` — `enabled`, `level`, `mode`, `dry_run`, `strip_comments`

## Tests

```bash
node --test
```

CI runs `node --test` on Ubuntu, Windows, and macOS:

https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml

## Security

See `SECURITY.md`. This plugin does not read API keys or call the network.

## License

MIT. See `LICENSE` and `NOTICE`.
