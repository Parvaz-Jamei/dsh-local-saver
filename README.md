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

Per-language tokenizers — not a generic `//` regex. Strings, templates,
regex literals and raw strings are left alone. Unknown language or a
failed scan (unclosed string/comment) removes nothing.

Kept: TODO FIXME XXX HACK WARNING NOTE BUG ~keep, JSDoc/Javadoc `/**`,
`///` `//!`, Python docstrings, lint directives.

```text
Use local_saver_toggle with strip_comments preview
Use local_saver_stats
Use local_saver_toggle with strip_comments on
```

`preview` only reports `comments_seen` / `removed` / `kept`.
Applies only to `read` / `read_file`. Git diffs are never stripped.

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

## License

MIT. See `LICENSE` and `NOTICE`.
