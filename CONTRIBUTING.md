# Contributing

Run the full suite before opening a pull request:

```bash
node --test
```

Do not use a shell glob (`test/*.test.js`) in docs or CI. Windows cmd
does not expand that the same way. The workflow already runs `node --test`.

CI matrix: Ubuntu, Windows, macOS, Node 20.

## Filters

New or changed filters under `rtk/filters/` need a unit test in `test/` that:

- feeds a fixture long enough to pass the 500-character floor
- asserts the expected filter name
- asserts the output is shorter when compression should apply
- covers Windows paths if the filter splits on `:`

## Comment scanners

Changes under `rtk/comments/` need tests that prove:

- noise comments are removed
- TODO / FIXME / WARNING / NOTE / JSDoc / Javadoc / docstrings stay
- slashes inside strings, regex, raw strings, and text blocks stay
- unknown language or unclosed string/comment is a total no-op
- strip never runs on write / edit / apply_patch / git diff

Do not add network calls or credential reads.
