# Sites smoke — PulseX IPFS WC (2026-11-22 / 2026-11-24)

**Result: SESSION only** — pair + approve. Not a Signed PASS.

## Path (mainnet session — 2026-11-22)
1. Pulse Perch Connect #1 → Suite Allow → emu YES → live session `0x73d0…36A8` on **369**
2. PulseX IPFS `pulsex.mypinata.cloud/ipfs/bafy…jipi/#/` (also `ipfs.app.pulsex.com`)
3. Connect Wallet → WalletConnect → extract `wc:` from `wcm-qrcode[uri]`
4. Perch Sites → paste URI → **Session request from PulseX** → **Approve session**
5. Perch shows session **PulseX** + status `Session approved — dApp can request signs`
6. PulseX UI drops “Connect Wallet” (connected)

## Testnet Signed (blocked 2026-11-24)
- `https://app.v4.testnet.pulsex.com` → **307** → `https://app.pulsex.com` (mainnet)
- Mainnet router `0x165C…52d9` / WPLS `0xA107…9a27` → **no code on 943**
- Desk Swap tab: mainnet-only by design (`swapMainnetOnly`)
- **Cannot** land a PulseX Signed PASS on testnet-only policy until a living 943 DEX UI + router exists

## Still open (369 only — intentional PLS)
- Live `eth_sendTransaction` (dust swap) → Sign on Trezor → broadcast hash

## Notes
- RainbowKit “Opening WalletConnect” deep-link path hides copy URI; QR `uri` attr is the reliable extract.
