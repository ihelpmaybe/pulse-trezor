# Sites WC eth_sendTransaction — lab (2026-11-22 / 2026-11-24)

**Result: PASS (wallet path + broadcast hash)** · 943 device sign · face Broadcast · mempool hash

## What ran (2026-11-24)
- Account #0 `0x73d0385F4d8E00C5e6504C6030F47BF6212736A8` · **943** (~2.31 tPLS) · Suite Desktop + emu **PQQ-SMOKE**
- Lab: `WC_CHAIN=eip155:943` `WC_VALUE_WEI=0x5af3107a4000` → pair → `REQUEST_ETH_SEND` 0.0001 self-send
- Perch Apps: Approve session (`https://lab.pulseperch.dev`) → clear-sign strip → **Sign on Trezor** → emu Address + Summary YES
- Face status: `Broadcast · 0xd6ab75e7…8873`
- Full hash (nonce **42**):  
  `0xd6ab75e700e0b3032f15cdf939128b358a0b63aca9c835e72a46967973558873`
- **Confirmed** receipt `status=0x1` · block `0x18c8a82` (after nonce-41 dust tip replaced at 10000 beats)
- Lab process still exited `TX_FAIL [object Object]` (relay/response race) — **wallet path completed and broadcast anyway** (same class as personal_sign / EIP-712 labs)

## Chain facts
- Chain id `0x3af` (943) · type-2 · value `0x5af3107a4000` · to self
- Nonce **41** dust RBF `0x469f…30dd` (tip 1 wei) blocked the queue until replaced; Instant tip (~1e6 beats) overflowed bag → RPC reject; **10000 / 10020 beats** replace cleared the lane

## Soft path (mainnet)
- Prefer **943** dust until mainnet PLS spend is intentional
- PulseX / site swap on **369** still needs mainnet dust + separate hash

## Lab follow-ups (non-blocking)
- Harden lab error stringify + keep process alive through sign → print HASH when wallet responds
