# Pulse Perch extension — privacy

Desk-wide policy: **[../PRIVACY.md](../PRIVACY.md)** · security: **[../SECURITY.md](../SECURITY.md)**.

**Product:** Pulse Perch browser extension (lab sideload; store listing is not a goal).  
**Maintainer:** community project (ihelpmaybe). Not affiliated with SatoshiLabs / Trezor Inc. as official Pulse support.

## What we collect
**Nothing.** The extension does not phone home. No analytics, no accounts, no crash telemetry from this package.

## What stays on your machine
- Injected `window.ethereum` talks to the open Pulse Perch desk tab in your browser.
- Signs go: dapp → extension → Perch desk → Trezor Suite → device. Keys never leave the Trezor.
- Desk preferences (RPC, watch address, etc.) live in ordinary browser / site storage for the Perch origin — not uploaded by this extension.

## Permissions (why)
- `tabs` / `scripting` — find the Perch desk tab and relay EIP-1193 requests; inject the inpage provider on websites.
- Host access (`https://*/*`, localhost) — so Pulse dapps can see Perch as a wallet. Prefer Sites (WalletConnect) when available.

## Third parties
- Dapps you visit see the same wallet APIs MetaMask-shaped sites expect (chain id, accounts, sign). Read what you sign on the Trezor screen.
- Trezor Suite is separate software you install; its privacy is governed by SatoshiLabs.

## Contact
Issues: the pulse-trezor GitHub repo. Do not trust DMs offering “support.”
