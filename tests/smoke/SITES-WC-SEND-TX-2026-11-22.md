# Sites WC eth_sendTransaction — lab (2026-11-22)

**Result: PARTIAL / BLOCKED on Suite Confirm**

## What ran
- Account #1 `0x73d0…36A8` has **~8.13 tPLS on 943**, **0 PLS on 369**
- Lab: `node scripts/wc-send-tx-lab.mjs` → `URI_READY` (`tmp-wc-uri.txt`)
- Perch opened with `?uri=wc:…` on testnet 943; Sites selected
- Connect #1 → Suite Grant Permissions for Pulse Perch (`127.0.0.1:5174`) appeared (PQQ-SMOKE)
- Device cancel path fired once: face showed **“Cancelled on Trezor — try again when ready.”** (honest)
- Suite Confirm click from agent did not land (window focus / monitor) → **no TX_OK hash this pass**

## Still open
- Live `eth_sendTransaction` dust → Suite Confirm → emu YES → PulseScan hash
- PulseX **swap** on 369 (needs mainnet dust)

## Lab default when 369 empty
Use **943 self-send dust** via WC (`WC_CHAIN=eip155:943`) until mainnet dust lands.
