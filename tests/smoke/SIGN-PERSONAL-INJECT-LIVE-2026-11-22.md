# Live inject personal_sign — 2026-11-22 (evening)

**Status: PASS**

## Result
- Settings → `window.ethereum (this tab)` **on**
- `window.ethereum.isPulsePerch === true`
- `personal_sign` → Suite → trezor-user-env YES
- Account: `0x73d0385F4d8E00C5e6504C6030F47BF6212736A8`
- Chain: `0x3af` (943 testnet)
- Message: `Pulse Perch live inject smoke 1795396914179`
- Signature: `0x969c2e0aea9a66dbee40dfa7c11a99e2f16a09a34c71b34928081de943bc899f1231cd7928636f6a9dac4ce434c0f9607ea9ac59527bdb28917e4e7f22ef20c21b`

## Path
Connect 10 → Suite Allow → emu YES → inject host `personal_sign`

## Not claimed
- MV3 extension cross-origin inject (Cursor browser can’t load unpacked Chrome extensions). Desk shell + bridge still the path; load `extension/` in Chrome for that lab.
