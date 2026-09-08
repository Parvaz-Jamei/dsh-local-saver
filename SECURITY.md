# Security

This plugin does not:

- read `$DSH_HOME/.credentials.yaml` or any other credential store
- send requests to `api.deepseek.com` or any other host
- proxy, log, or cache API keys
- write tool-output text to disk

The only optional file write is `DSH_LOCAL_SAVER_PERSIST=1`, which stores two numbers (`calls`, `saved`) in `$DSH_HOME/local-saver-stats.json`.

## Reporting a vulnerability

Use GitHub Security Advisories on this repository (Security → Advisories → New draft advisory). Do not open a public issue for credential or key-handling bugs.

If advisory drafts are unavailable, email the maintainer through the address on [github.com/Parvaz-Jamei](https://github.com/Parvaz-Jamei).
