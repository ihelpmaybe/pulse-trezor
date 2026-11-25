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
Prior: **0.1.4** SHA256 `68a6acd19a0df9c9596d99c4ece6f6283c27f4b6045d339f8f5dc644bae52f42` — cached `eth_accounts` (theater; killed in 0.1.5).
Current pack: **0.1.5** SHA256 `74b742d18acba67f3f3c1f1179c0d363d5d53943a32460624605a65cb0f96f90` — offscreen desk bridge; storage may hint `eth_chainId` / `net_version` only; **`eth_accounts` returns `[]` when desk+offscreen are cold** (no fake connected wallet).

## Install (Load unpacked)
1. `npm run dev` (desk on `:5174`) — or open your hosted Perch build
2. Chrome → **Extensions** → Developer mode → **Load unpacked** → this `extension/` folder  
   (or unzip the release pack and load that folder)
3. Lab shortcut: `scripts\chrome-ext-lab.ps1` (CDP `:9233`, profile `tmp-chrome-ext-lab2`)  
   Chrome 157+ often ignores `--load-extension` — if Pulse Perch is missing, **Load unpacked** once on `chrome://extensions`.
4. Open Perch → Connect Trezor once (seeds offscreen iframe + chain hint)
5. You may close the visible desk tab — **accounts stay empty unless offscreen/desk answers**; signs use offscreen or re-open desk
6. Open a Pulse dapp → Connect wallet needs live desk/offscreen (not storage theater)

Cursor Simple Browser cannot load unpacked MV3 — use real Chrome.

## Smoke (lab CDP)
- `scripts/ext-cdp-smoke.mjs` — identity
- `scripts/ext-connect-chain-smoke.mjs` — Connect + chain + accounts
- `scripts/ext-personal-sign-smoke.mjs` · `ext-typed-data-smoke.mjs` · `ext-send-dust-smoke.mjs`
- `scripts/ext-closed-desk-smoke.mjs` — no live desk: `eth_accounts` → `[]`; chain hint may still answer
- `scripts/ext-events-smoke.mjs` — desk chain flip → dapp `chainChanged` / `accountsChanged`

## Flow
dapp → `inpage.js` → content → background →
  (1) visible Perch tab `perch-bridge.js`, else
  (2) offscreen iframe desk, else
  (3) storage chain hint only (`eth_chainId` / `net_version`) — never resurrect accounts
→ EIP-1193 host → Connect/Suite/device

Account / chain changes on the desk fan out: desk → `perch-bridge` → background → dapp `content.js` → `accountsChanged` / `chainChanged` on `window.ethereum`.

## Limits
- Desk must be Connected for signs (Trezor via Suite) — offscreen only hosts the desk app, not a software keyring
- **0.1.5:** offscreen · no fake `eth_accounts` from storage · sign/connect opens desk if offscreen miss · toolbar badge honesty
- Not Chrome Web Store listed yet — sideload / lab zip only
- Prefer Sites (WalletConnect) when the dapp supports it
