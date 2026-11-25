# Desk portable pack smoke — 2026-11-24

**Result: PASS (zip + sha)** · unsigned web pack · not Authenticode / notarize  
**Git:** `dd2e41d` (desk polish ship honesty)

## Ran
```bash
npm run build
npm run desk:pack
```

## Artifacts
| File | Notes |
|------|--------|
| `release/pulse-perch-0.1.0-web.zip` | contents of `dist/` |
| `release/pulse-perch-0.1.0-web.zip.sha256` | `01b56cd38c13e052ae48ea4d7fa827acd386d138f5177321cce699ea02776c63` |

## Honesty
- This proves **portable web zip + SHA256**, not a signed installer.
- Authenticode / notarize stay OPEN ([DESKTOP-PACK.md](../../docs/DESKTOP-PACK.md)).
- Suite still required for Trezor after unzip + static serve.
- Remote backup: `origin/main` on GitHub (`ihelpmaybe/pulse-trezor`). Local zip is gitignored under `release/`.
