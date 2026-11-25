# Sites smoke — Piteas WC (2026-11-22)

**Result: SESSION only** — pair + approve. Not a Signed PASS; no swap/sign exercised.

## Path
1. Pulse Perch Connect #1 → Suite Allow → session (Account #1 `0x73d0…36A8`)
2. Reown project id already in localStorage / `.env.local`
3. Piteas `app.piteas.io` → Connect Wallet → WalletConnect → QR URI
4. Perch Sites → paste `wc:…` → session proposal from Piteas → **Approve session**
5. Piteas UI shows connected `0x73d03…736A8`

## Still open
- PulseX IPFS browser pair
- Live `eth_sendTransaction` / typed-data sign through Perch → Trezor
