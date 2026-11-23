# personal_sign smoke — injected bridge (2026-11-22)

**Status: PASS**

## Result
- Via `window.__pulsePerchInject.request({ method: "personal_sign", … })`
- Message: `Pulse Perch inject smoke`
- Account: `0x73d0385F4d8E00C5e6504C6030F47BF6212736A8`
- Signature: `0x538c0b5fc7b0bc6ea8ed135d6281194c00ccf62b68ed7a1bcf12d9d196e517e23078e8d9d347e706f20cef23dd19af82a36d23011ec206a7cc76ee4d0a6671a41b`

## Path
Connect 10 → Suite “Sign message” → trezor-user-env YES (spaced) → EIP-1193 host

## Notes
- Same lab emu authenticity banner as tx smoke
- Extension shell (`extension/`) relays into this bridge; this-tab Settings inject optional
