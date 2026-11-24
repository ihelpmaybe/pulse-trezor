# Pulse Perch — browser extension (lab / sideload)

Cross-origin `window.ethereum` for sites that only look for MetaMask.  
Signs go through Pulse Perch desk (visible tab **or** MV3 offscreen iframe) → Trezor Suite → device. No soft-seed in the extension.

Chrome Web Store listing is **not** submitted yet — see [docs/EXT-CWS-READY.md](../docs/EXT-CWS-READY.md). Privacy draft: [PRIVACY.md](./PRIVACY.md).

## Pack
```bash
npm run ext:pack
```
Zip + SHA256 land at `dist-ext/pulse-perch-extension-<version>.zip` (and `.sha256`).

Release packs: bump `manifest.json` → `npm run ext:pack` → record SHA256 here.
Prior: `extension-0.1.3` SHA256 `ee20f658b4c79ea15b7a69f1278f42d238a8a152d251489031e3ff31e7a6d595`
Current pack: **0.1.4** SHA256 `68a6acd19a0df9c9596d99c4ece6f6283c27f4b6045d339f8f5dc644bae52f42` — offscreen desk bridge + `chrome.storage` session cache for `eth_accounts` / `eth_chainId` when the visible desk tab is closed; signs still Connect/Suite.

## Install (Load unpacked)
1. `npm run dev` (desk on `:5174`) — or open your hosted Perch build
2. Chrome → **Extensions** → Developer mode → **Load unpacked** → this `extension/` folder  
   (or unzip the release pack and load that folder)
3. Lab shortcut: `scripts\chrome-ext-lab.ps1` (CDP `:9233`, profile `tmp-chrome-ext-lab2`)  
   Chrome 157+ often ignores `--load-extension` — if Pulse Perch is missing, **Load unpacked** once on `chrome://extensions`.
4. Open Perch → Connect Trezor once (seeds storage + offscreen iframe)
5. You may close the visible desk tab — reads stay cached; signs use offscreen or re-open desk
6. Open a Pulse dapp → Connect wallet should see Perch

Cursor Simple Browser cannot load unpacked MV3 — use real Chrome.

## Smoke (lab CDP)
- `scripts/ext-cdp-smoke.mjs` — identity
- `scripts/ext-connect-chain-smoke.mjs` — Connect + chain + accounts
- `scripts/ext-personal-sign-smoke.mjs` · `ext-typed-data-smoke.mjs` · `ext-send-dust-smoke.mjs`
- `scripts/ext-closed-desk-smoke.mjs` — no session → 4100; with prior Connect, cached reads OK
- `scripts/ext-events-smoke.mjs` — desk chain flip → dapp `chainChanged` / `accountsChanged`

## Flow
dapp → `inpage.js` → content → background →
  (1) visible Perch tab `perch-bridge.js`, else
  (2) offscreen iframe desk, else
  (3) storage cache for read-only methods
→ EIP-1193 host → Connect/Suite/device

Account / chain changes on the desk fan out: desk → `perch-bridge` → background → dapp `content.js` → `accountsChanged` / `chainChanged` on `window.ethereum` (+ session cache).

## Limits
- Desk must be Connected for signs (Trezor via Suite) — offscreen only hosts the desk app, not a software keyring
- **0.1.4:** offscreen permission · session cache · sign/connect opens desk if offscreen miss · toolbar badge
- Not Chrome Web Store listed yet — sideload / lab zip only
- Prefer Sites (WalletConnect) when the dapp supports it
