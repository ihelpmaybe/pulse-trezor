# Scripts

| Kind | Names | Notes |
|------|-------|-------|
| Ship / smoke | `gate1-*.mjs`, `ext-*-smoke.mjs`, `suite-down-smoke.mjs`, `fuzz-watch.mjs` | CI / Gate evidence |
| WC labs | `wc-*.mjs` | Need `REOWN_PROJECT_ID` (see `.env.example`) |
| Ext labs | `ext-*.mjs`, `chrome-ext-lab.ps1` | CDP lab Chrome |
| One-off probes | — | Removed (`_probe` / `_click` / `_reconnect` CDP scratch) |

`tmp-chrome-*` / `tmp-*.json` / `tmp-*.log` are gitignored.
