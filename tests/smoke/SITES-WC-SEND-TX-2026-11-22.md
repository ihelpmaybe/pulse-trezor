# Sites WC eth_sendTransaction — lab (2026-11-22)

**Result: PASS (wallet face) · lab dapp TX_FAIL on relay** · soft-path coaching 2026-11-24

## What ran
- Account #1 `0x73d0…36A8` · **943** (~8 tPLS) · **0 PLS on 369**
- Lab: `node scripts/wc-send-tx-lab.mjs` → pair → `REQUEST_ETH_SEND` 0.001 self-send
- Perch Sites: Approve session (lab.pulseperch.dev) → clear-sign strip → **Sign on Trezor**
- Face status after Suite/device: **Signed · eth_sendTransaction**
- Lab process exited `TX_FAIL` (`No matching key` on WC relay) — dapp did not print hash; wallet path still completed

## Soft path (no mainnet dust)
- Face shows coach copy on `eth_sendTransaction`: Suite Confirm may be on another screen; need PLS for gas; prefer **943** until mainnet dust is intentional (`src/wc/txSoftPath.ts`).
- Insufficient / Confirm failures map to soft English — does **not** claim a PulseScan hash.
- Gate checklist: Sites **tx/swap on 369** stays OPEN until dust + hash evidence.

## Still open
- Capture PulseScan / broadcast hash from face Activity
- PulseX **swap** on 369 (needs mainnet dust)
- Harden lab script error stringify + keep process alive through sign

## Lab default when 369 empty
Use **943 self-send dust** via WC (`WC_CHAIN=eip155:943`) until mainnet dust lands.
