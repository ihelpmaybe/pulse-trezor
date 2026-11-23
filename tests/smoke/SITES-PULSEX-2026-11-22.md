# Sites smoke — PulseX IPFS WC (2026-11-22)

**Result: PASS (session)** — pair + approve. Sign/swap not finished in this pass (awaiting dust-sign OK).

## Path
1. Pulse Perch Connect #1 → Suite Allow → emu YES → live session `0x73d0…36A8` on **369**
2. PulseX IPFS `pulsex.mypinata.cloud/ipfs/bafy…jipi/#/` (also `ipfs.app.pulsex.com`)
3. Connect Wallet → WalletConnect → extract `wc:` from `wcm-qrcode[uri]`
4. Perch Sites → paste URI → **Session request from PulseX** → **Approve session**
5. Perch shows session **PulseX** + status `Session approved — dApp can request signs`
6. PulseX UI drops “Connect Wallet” (connected)

## Still open
- Live `eth_sendTransaction` (dust swap) → Sign on Trezor → broadcast
- Confirm tx hash on PulseScan

## Blocker for sign
- Account `0x73d0…36A8` **0 PLS** on mainnet 369 (MCP `get_balance`). PulseX quote for 0.01 PLS → **Insufficient PLS balance**.
- Need: dust PLS on that address, **or** a message/typed-data sign path that doesn’t spend gas from empty bag.

## Notes
- RainbowKit “Opening WalletConnect” deep-link path hides copy URI; QR `uri` attr is the reliable extract.
- Prior Piteas session still listed alongside PulseX.
