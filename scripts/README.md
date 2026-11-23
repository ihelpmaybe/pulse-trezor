# Scripts

| Kind | Names | Notes |
|------|-------|-------|
| Ship / smoke | `gate1-*.mjs`, `ext-*-smoke.mjs`, `suite-down-smoke.mjs`, `fuzz-watch.mjs` | CI / Gate evidence |
| WC labs | `wc-*.mjs` | Need `REOWN_PROJECT_ID` (see `.env.example`) |
| Ext labs | `ext-*.mjs`, `chrome-ext-lab.ps1` | CDP lab Chrome |
| One-off probes | `_probe-*.mjs`, `_click-*.mjs`, `_reconnect-*.mjs` | Local debugging only — not product surface |

`tmp-chrome-*` profiles are gitignored. Delete when disk fills (~1GB+).
