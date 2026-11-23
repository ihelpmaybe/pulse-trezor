# Sites smoke — ProveX WC (2026-11-22)

**Result: PASS (session)** — pair + approve. Escrow/sign not exercised.

## Path
1. Pulse Perch Connect #1 → Suite Allow → live session `0x73d0…36A8` on **369**
2. `app.provex.com` → Connect Wallet → WalletConnect QR (`w3m` / Reown)
3. Extract `wc:` from `wui-qr-code[uri]` / `w3m-connecting-wc-qrcode.uri`
4. Perch Sites → paste URI → **Session request from ProveX** (origin `https://app.provex.com`)
5. Origin warn checkbox required (Perch flagged lookalike Pulse brand — **false positive**: `prover?x` matched `provex`) → check → **Approve session**
6. Perch shows session **ProveX** + status `Session approved — dApp can request signs`

## Fix (same night)
- `clearSign.ts` PHISH_HINTS: stop matching official `app.provex.com` / `provex.com`; still flag `proverx.*` / `prove-x.*` typosquats. Unit tests added.

## Still open
- Escrow / release clear-sign when a real trade hits WC

## Notes
- Same Reown modal pattern as HEX IPFS.
- Pair kept working after dapp tab navigate-away (relay held proposal briefly).
