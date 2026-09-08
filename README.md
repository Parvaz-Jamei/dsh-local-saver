# dsh-local-saver

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js)](https://nodejs.org/)
[![test](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml/badge.svg)](https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml)

## Disclaimer

Independent, community-built utility. Not affiliated with, endorsed
by, or sponsored by DeepSeek or 9Router. Filter logic under rtk/ is a
compatible re-implementation ported under 9Router's MIT license.

**Compression is lossy.** Comment stripping is also lossy and **off by default**.

Token figures in `local_saver_stats` are **approx chars/4**.

## Strip comments (off by default)

Per-language scanners, not a generic `//` regex. Default is **off**.
Unknown, ambiguous, or unclosed structure → no deletion.

Supported scanners only:

- JavaScript / TypeScript (strings, templates, regex literals)
- Python (strings, prefixes, docstrings)
- Java (including text blocks `"""`)
- C / C++ (including raw strings `R"delim(... )delim"`)
- Rust (raw strings `r#"..."#`)
- Kotlin / Swift multiline and raw strings
- C# verbatim/raw strings, Go raw backticks
- HTML/XML comments, shell `#`

Not claimed: PHP, Ruby, Lua, SQL, Dart, Scala, Haskell, Elixir, etc.
Those are a no-op.

Language comes from the tool payload path/extension first, then shebang,
then a single unambiguous content guess. A mention like `example.py`
inside another file does not select Python.

Kept: TODO FIXME XXX HACK WARNING NOTE BUG ~keep, JSDoc/Javadoc `/**`,
`///` `//!`, Python docstrings, lint directives.

Applies only to `read` / `read_file`. Never on `write`, `edit`,
`apply_patch`, or git diffs.

```text
Use local_saver_toggle with strip_comments preview
Use local_saver_stats
Use local_saver_toggle with strip_comments on
```

`preview` reports `comments_seen` / `removed` / `kept` and does not rewrite.

## Install

```bash
dsh plugin --profile web add "github:Parvaz-Jamei/dsh-local-saver"
```

## Env

| Variable | Values | Default |
|---|---|---|
| `DSH_LOCAL_SAVER` | `off` / `0` / `false` | **on** |
| `DSH_LOCAL_SAVER_LEVEL` | `1` `2` `3` | `3` |
| `DSH_LOCAL_SAVER_MODE` | `coding-safe` `balanced` `aggressive` | `coding-safe` |
| `DSH_LOCAL_SAVER_STRIP_COMMENTS` | `off` / `preview` / `on` | **off** |
| `DSH_LOCAL_SAVER_DRY_RUN` | `1` | off |
| `DSH_SESSION` / `DSH_WORKSPACE` | any string | cache scope |

## Tests

```bash
node --test
```

CI runs `node --test` on Ubuntu, Windows, and macOS:
https://github.com/Parvaz-Jamei/dsh-local-saver/actions/workflows/test.yml

## License

MIT. See `LICENSE` and `NOTICE`.
