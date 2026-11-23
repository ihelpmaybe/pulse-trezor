# Desk smoke evidence

**CI (no device):** `.github/workflows/smoke.yml` runs typecheck + build + unit path/error smoke.

**Manual / emu (HWW — don’t pretend):** Connect 10 → **Trezor Suite** (Desktop WS `:21335` preferred, or Suite Web popup) → real Safe or official Suite/user-env emu.  
Legacy standalone Bridge `:21325` is **not** the Connect 10 path.

| # | Step | Pass? | Date / note |
|---|------|-------|-------------|
| 1 | Warm Connect 10 + Suite reachable | YES | 2026-11-22 · Suite WS :21335 · see GATE-T-2026-11-22.md |
| 2 | Connect → address on device screen matches Desk | YES | 2026-11-22 · `0x73d0…A8` · GATE-T-2026-11-22.md |
| 3 | PLS balance fetch (A1) | YES | 2026-11-22 · faucet 10 tPLS |
| 4 | Send dust PLS on **testnet 943** → confirmed (A1) | YES | tx `0x073e…3d11` · GATE-T-2026-11-22.md |
| 5 | ERC-20 transfer once (A2) | YES | 2026-11-22 · WPLS self `0xb35d…07a1` · [ERC20-SEND-2026-11-22.md](./ERC20-SEND-2026-11-22.md) |
| 6 | Disconnect → watch-only still shows address/balances | YES | 2026-11-22 · localStorage `pulse-trezor-watch-v1` |
| 7 | Silent a11y plumbing (live region, dialog focus, tabs, labels) | YES | 2026-11-22 · [A11Y-2026-11-22.md](./A11Y-2026-11-22.md) |
| 8 | Sites: PulseX IPFS WC session approve | YES | 2026-11-22 · [SITES-PULSEX-2026-11-22.md](./SITES-PULSEX-2026-11-22.md) |
| 9 | Sites: WC **personal_sign** on device | YES | 2026-11-22 · [SITES-WC-PERSONAL-SIGN-2026-11-22.md](./SITES-WC-PERSONAL-SIGN-2026-11-22.md) |
| 9a | Sites: WC **eth_signTypedData_v4** | YES | 2026-11-22 · wallet path · [SITES-WC-EIP712-2026-11-22.md](./SITES-WC-EIP712-2026-11-22.md) |
| 9b | Sites: WC **eth_sendTransaction** dust | | PARTIAL · [SITES-WC-SEND-TX-2026-11-22.md](./SITES-WC-SEND-TX-2026-11-22.md) · 943 dust ready; hash not landed |
| 9c | Sites: HEX IPFS WC session approve | YES | 2026-11-22 · [SITES-HEX-2026-11-22.md](./SITES-HEX-2026-11-22.md) |
| 9d | Sites: ProveX WC session approve | YES | 2026-11-22 · [SITES-PROVEX-2026-11-22.md](./SITES-PROVEX-2026-11-22.md) |
| 10 | Inject this-tab: personal_sign live | YES | 2026-11-22 · [SIGN-PERSONAL-INJECT-LIVE-2026-11-22.md](./SIGN-PERSONAL-INJECT-LIVE-2026-11-22.md) |
| 11 | MV3 extension load-unpacked checklist | PARTIAL | 2026-11-22 · load+inject PASS · chainId needs Connect · [EXT-MV3-2026-11-22.md](./EXT-MV3-2026-11-22.md) |

Tick matching boxes in [TODO.md](../../TODO.md) only with a row filled here (or CI log URL).
