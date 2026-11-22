# Desk smoke evidence

**CI (no device):** `.github/workflows/smoke.yml` runs typecheck + build + unit path/error smoke.

**Manual / emu (HWW — don’t pretend):** Connect → Bridge → real Safe or official Suite emulator.

| # | Step | Pass? | Date / note |
|---|------|-------|-------------|
| 1 | Warm Connect + Bridge reachable | | |
| 2 | Connect → address on device screen matches Desk | | |
| 3 | PLS balance fetch (A1) | | |
| 4 | Send dust PLS on **testnet 943** → confirmed (A1) | | |
| 5 | ERC-20 transfer once (A2) | | |
| 6 | Disconnect → watch-only registry loads (A3) | | |

Tick matching boxes in [TODO.md](../../TODO.md) only with a row filled here (or CI log URL).
