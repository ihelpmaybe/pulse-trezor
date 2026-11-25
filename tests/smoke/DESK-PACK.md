# Desk portable pack smoke — 2026-11-24

**Result: PASS (zip + sha)** · unsigned web pack · not Authenticode / notarize

## Ran
```bash
npm run build
npm run desk:pack
```

## Artifacts
| File | Notes |
|------|--------|
| `release/pulse-perch-0.1.0-web.zip` | contents of `dist/` |
| `release/pulse-perch-0.1.0-web.zip.sha256` | `02cbd18fda9eb5747bbf95ee1ff7114ac7daeb4fafea101942fe28c6327862f0` |

## Honesty
- This proves **portable web zip + SHA256**, not a signed installer.
- Authenticode / notarize stay OPEN ([DESKTOP-PACK.md](../../docs/DESKTOP-PACK.md)).
- Suite still required for Trezor after unzip + static serve.
