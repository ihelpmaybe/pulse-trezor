# Pulse Perch — browser extension (lab / sideload)

Cross-origin `window.ethereum` for sites that only look for MetaMask.  
Signs go through the open Pulse Perch desk tab → Trezor Suite → device.

## Pack
```bash
npm run ext:pack
```
Zip lands at `dist-ext/pulse-perch-extension-<version>.zip` (icons + MV3 shell).

Release `extension-0.1.2` SHA256:

`819da484d586dc95ab7db00e178a0ec68e4f6a2b7b2b5034862c1f2108b85d27`

## Load unpacked
1. `npm run dev` (desk on `:5174`)
2. Lab Chrome: `scripts\chrome-ext-lab.ps1` (CDP `:9233`) **or** Chrome → Extensions → Load unpacked → this `extension/` folder
3. Open Perch → Connect Trezor
4. Open a Pulse dapp → Connect wallet should see Perch

Cursor Simple Browser cannot load unpacked MV3 — use real Chrome.

## Smoke (lab CDP)
- `scripts/ext-cdp-smoke.mjs` — identity
- `scripts/ext-connect-chain-smoke.mjs` — Connect + chain + accounts
- `scripts/ext-personal-sign-smoke.mjs` · `ext-typed-data-smoke.mjs` · `ext-send-dust-smoke.mjs`
- `scripts/ext-closed-desk-smoke.mjs` — desk closed → 4100, no new tab

## Flow
dapp → `inpage.js` → content → background → Perch tab `perch-bridge.js` → EIP-1193 host → Connect/Suite/device

Account / chain changes on the desk fan out: desk → `perch-bridge` → background → dapp `content.js` → `accountsChanged` / `chainChanged` on `window.ethereum`.

## Limits
- Desk tab must stay open and Connected for signs
- Not Chrome Web Store listed yet — sideload / lab zip only
- Prefer Sites (WalletConnect) when the dapp supports it
