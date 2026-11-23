# Pulse Perch — browser extension (lab / sideload)

Cross-origin `window.ethereum` for sites that only look for MetaMask.  
Signs go through the open Pulse Perch desk tab → Trezor Suite → device.

Chrome Web Store listing is **not** submitted yet — see [docs/EXT-CWS-READY.md](../docs/EXT-CWS-READY.md). Privacy draft: [PRIVACY.md](./PRIVACY.md).

## Pack
```bash
npm run ext:pack
```
Zip + SHA256 land at `dist-ext/pulse-perch-extension-<version>.zip` (and `.sha256`).

Release `extension-0.1.2` SHA256:

`2b31f8355dde5e63457f79a0bdcb2b61d8a074869b703241c46b12e890e009a7`

## Install (Load unpacked)
1. `npm run dev` (desk on `:5174`) — or open your hosted Perch build
2. Chrome → **Extensions** → Developer mode → **Load unpacked** → this `extension/` folder  
   (or unzip the release pack and load that folder)
3. Lab shortcut: `scripts\chrome-ext-lab.ps1` (CDP `:9233`)
4. Open Perch → Connect Trezor → keep that tab open
5. Open a Pulse dapp → Connect wallet should see Perch

Cursor Simple Browser cannot load unpacked MV3 — use real Chrome.

## Smoke (lab CDP)
- `scripts/ext-cdp-smoke.mjs` — identity
- `scripts/ext-connect-chain-smoke.mjs` — Connect + chain + accounts
- `scripts/ext-personal-sign-smoke.mjs` · `ext-typed-data-smoke.mjs` · `ext-send-dust-smoke.mjs`
- `scripts/ext-closed-desk-smoke.mjs` — desk closed → 4100, no new tab
- `scripts/ext-events-smoke.mjs` — desk chain flip → dapp `chainChanged` / `accountsChanged`

## Flow
dapp → `inpage.js` → content → background → Perch tab `perch-bridge.js` → EIP-1193 host → Connect/Suite/device

Account / chain changes on the desk fan out: desk → `perch-bridge` → background → dapp `content.js` → `accountsChanged` / `chainChanged` on `window.ethereum`.

## Limits
- Desk tab must stay open and Connected for signs
- Not Chrome Web Store listed yet — sideload / lab zip only
- Prefer Sites (WalletConnect) when the dapp supports it
