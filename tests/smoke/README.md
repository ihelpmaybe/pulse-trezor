# Desk smoke evidence

**CI (no device):** `.github/workflows/smoke.yml` runs typecheck + build + unit path/error smoke.

**Manual / emu (HWW — don’t pretend):** Connect 10 → **Trezor Suite** (Desktop WS `:21335` preferred, or Suite Web popup) → real Safe or official Suite/user-env emu.  
Legacy standalone Bridge `:21325` is **not** the Connect 10 path.

## Soft vs hard (honesty)

| Kind | Meaning | Do not tick Gate “complete” from this alone |
|------|---------|-----------------------------------------------|
| **HARD** | Evidence row with hash / live PASS | — |
| **SOFT** | Wallet path / coach / Anvil / contract smoke | WC mainnet hash · device RBF · human NVDA |

Cross-check: [docs/GATE-1-CHECKLIST.md](../../docs/GATE-1-CHECKLIST.md).

## Hard (proven)

| # | Step | Pass? | Date / note |
|---|------|-------|-------------|
| 1 | Warm Connect 10 + Suite reachable | YES | 2026-11-22 · Suite WS :21335 · GATE-T-2026-11-22.md |
| 2 | Connect → address on device screen matches Desk | YES | 2026-11-22 · `0x73d0…A8` · GATE-T |
| 3 | PLS balance fetch (A1) | YES | 2026-11-22 · faucet 10 tPLS |
| 4 | Send dust PLS on **testnet 943** → confirmed (A1) | YES | tx `0x073e…3d11` · GATE-T |
| 5 | ERC-20 transfer once (A2) | YES | 2026-11-22 · WPLS · [ERC20-SEND-2026-11-22.md](./ERC20-SEND-2026-11-22.md) |
| 6 | Disconnect → watch-only still shows address/balances | YES | 2026-11-22 · localStorage watch |
| 8 | Sites: PulseX IPFS WC session approve | YES | [SITES-PULSEX-2026-11-22.md](./SITES-PULSEX-2026-11-22.md) |
| 9 | Sites: WC **personal_sign** on device | YES | [SITES-WC-PERSONAL-SIGN-2026-11-22.md](./SITES-WC-PERSONAL-SIGN-2026-11-22.md) |
| 9a | Sites: WC **eth_signTypedData_v4** | YES | [SITES-WC-EIP712-2026-11-22.md](./SITES-WC-EIP712-2026-11-22.md) |
| 9c | Sites: HEX IPFS WC session approve | YES | [SITES-HEX-2026-11-22.md](./SITES-HEX-2026-11-22.md) |
| 9d | Sites: ProveX WC session approve | YES | [SITES-PROVEX-2026-11-22.md](./SITES-PROVEX-2026-11-22.md) |
| 10 | Inject this-tab: personal_sign live | YES | [SIGN-PERSONAL-INJECT-LIVE-2026-11-22.md](./SIGN-PERSONAL-INJECT-LIVE-2026-11-22.md) |
| 12 | Portable desk zip + sha | YES | 2026-11-24 · [DESK-PACK.md](./DESK-PACK.md) |

## Soft / OPEN (do not over-claim)

| # | Step | Status | Note |
|---|------|--------|------|
| 7 | Silent a11y **contract** smoke | YES (CI) | [A11Y-2026-11-22.md](./A11Y-2026-11-22.md) · human NVDA still OPEN (`tests/a11y/NVDA-CHECKLIST.md`) |
| 9b | Sites: WC **eth_sendTransaction** | SOFT | Wallet path + coach; hash not landed · [SITES-WC-SEND-TX-2026-11-22.md](./SITES-WC-SEND-TX-2026-11-22.md) |
| 11 | MV3 extension load-unpacked | PARTIAL | Sideload OK; CWS listing **not a goal** · [EXT-MV3-2026-11-22.md](./EXT-MV3-2026-11-22.md) |
| RBF | Speed up / Cancel on **device** mempool | OPEN | Anvil + face coach PASS · [RBF-STUCK-PLAYBOOK.md](../../docs/RBF-STUCK-PLAYBOOK.md) |
| 369 | Mainnet Sites tx / swap dust | OPEN | Needs intentional PLS dust |

Tick matching boxes in [TODO.md](../../TODO.md) only with a row filled here (or CI log URL). Soft rows do not close Gate marketing.
