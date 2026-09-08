# Contributing

Run tests before opening a pull request:

```bash
node --test test/*.test.js
```

CI runs the same tests on Linux, Windows, and macOS.

New or changed filters under `rtk/filters/` need a unit test in `test/` that:

- feeds a fixture long enough to pass `MIN_COMPRESS_SIZE` (500 characters)
- asserts the expected `filterName`
- asserts the output is shorter than the input when compression should apply
- covers Windows paths if the filter splits on `:`

Do not add network calls or credential reads.
