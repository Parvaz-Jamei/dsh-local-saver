# Changelog

## 0.6.2

- C-like scanner checks raw / multiline / verbatim strings before `//` or `/*`.
- `/* ... */` is recorded with `start/end/type/value`; cursor advances past `*/`.
- Unclosed block comment returns `{ ok: false, reason: "unclosed-block-comment" }` and strips nothing.
- `scanCppRaw` and `scanRustRaw` run on the live scan path.
- Tests for Java, C/C++, Rust, Kotlin, Swift, C#, Go block comments plus raw/text-block slashes.

## 0.6.1

- Per-language scanners instead of one C-family catch-all.
- Language from tool payload path/extension first.
- Comment strip only on `read` / `read_file`. Git diffs, write, edit, apply_patch never stripped.
- Honest language list in README. Unknown / ambiguous language is a no-op.

## 0.6.0

- Optional comment strip (`off` / `preview` / `on`), default off.
- Preview reports `comments_seen` / `removed` / `kept` without rewriting.
- Keep TODO, FIXME, WARNING, NOTE, JSDoc/Javadoc, Python docstrings.

## 0.5.x

- coding-safe default, persist stats, SHA-256 cache keys, keepErrors after cap.
