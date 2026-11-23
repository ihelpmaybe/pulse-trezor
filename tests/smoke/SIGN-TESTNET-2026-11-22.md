# Sign smoke — Pulse testnet dust (2026-11-22)

**Status: PASS**

## Result
- **Tx:** `0x8bd91180123fdb2d8d5d6d5c7f44810d1fe944aab7c17e97f7bb7a1b6ac22c6e`
- **Explorer:** https://scan.v4.testnet.pulsechain.com/tx/0x8bd91180123fdb2d8d5d6d5c7f44810d1fe944aab7c17e97f7bb7a1b6ac22c6e
- **From/to:** `0x73d0385F4d8E00C5e6504C6030F47BF6212736A8` (self)
- **Amount:** `0.001` tPLS · fee ~`1.18125` tPLS (~39k beats — network, not Perch)
- **Path:** Connect 10 → Suite Confirm → trezor-user-env emu YES (`ws://127.0.0.1:9001` `emulator-press-yes`)

## Steps
1. Network = PulseChain Testnet V4 (943)
2. Connect #1 → Suite linked · `0x73d0…36A8` · ~8.95 tPLS
3. Send self `0.001` → Signing…
4. Suite **Grant permissions** → **Confirm** once (no spam)
5. Suite **Confirm on Trezor** → emu YES ×3 with **~1.8s yield** between presses
6. Perch showed Tx link; Sign & send idle again

## Lab notes
- Suite authenticity-check banner expected on emu (not a product bug)
- Fast YES spam → Suite Error `button request already pending` — close, cancel Perch, retry slower
- Agent drives Suite Confirm + emu (no physical device)

## Not covered
- Mainnet / PulseX WC live sign (0 PLS bag earlier — separate)
- ERC-20 send smoke
