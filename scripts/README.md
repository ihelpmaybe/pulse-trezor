# Scripts

| Kind | Names | Notes |
|------|-------|-------|
| Ship / smoke | `gate1-*.mjs`, `ext-*-smoke.mjs`, `suite-down-smoke.mjs`, `fuzz-watch.mjs` | CI / Gate evidence |
| Trezor lab | `lab-user-env.ps1`, `lab-user-env-smoke.mjs`, `emu-yes.ps1` | Official user-env · don’t-pretend |
| WC labs | `wc-*.mjs` | Need `REOWN_PROJECT_ID` (see `.env.example`) |
| Ext labs | `ext-*.mjs`, `chrome-ext-lab.ps1` | CDP lab Chrome |
| One-off probes | — | Removed (`_probe` / `_click` / `_reconnect` CDP scratch) |

**Lab wire:** Perch → Connect 10 → Suite → user-env Bridge/emu. `lab-user-env.ps1 -Action up` then Settings → Probe lab. Never soft-seed.

`tmp-chrome-*` / `tmp-*.json` / `tmp-*.log` are gitignored.
