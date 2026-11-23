# Gate 1 — live Approve amount (testnet 943) · 2026-11-23

**Status: PASS** · Desk Grant → Approve amount → Suite → emu YES · no MetaMask.

## Live
| Step | Result |
|------|--------|
| Account | `#1` `0x73d0…36A8` · chain **943** |
| Token | WPLS (custom import) `0x70499adEBB11Efd915E3b69E700c331778628707` |
| Spender | PulseX V2 Router `0x165C…52d9` |
| Amount | `1` WPLS (`1e18`) |
| Confirm | Trezor emu YES |
| Latest tx | [`0xedb0…67a3`](https://scan.v4.testnet.pulsechain.com/tx/0xedb0ea514145aa3aeb61258ebe54046ab01fa4328045c30b941b56d7002867a3) · status **1** · block `25972779` |
| Prior same grant | [`0x03d0…6bbe`](https://scan.v4.testnet.pulsechain.com/tx/0x03d0981ba796b327b5b60612442e6fba35b653ed6fb719f73c365be928bf6bbe) · block `25972740` |

## Notes
- Pack tokens are mainnet-only; testnet approve needs Import token (WPLS) then pick from balances.
- Activity face shows two **Out · approve · Nov 23** rows.
- Scripts: `scripts/gate1-approve-smoke.mjs`, `scripts/emu-yes.ps1`
