# Privacy — Pulse Perch

**Wholesome default:** Perch does not phone home. No analytics SDK, no crash reporter, no accounts with us, no seed, no private keys in the browser.

## What never leaves your Trezor

- Seed / mnemonic / private keys — Perch never asks for them and has no path to store them.
- Signatures happen **Suite → device**. The browser can lie; the Trezor screen is truth.

## What stays on this machine (local only)

- Theme, dox shield, a11y prefs, custom RPCs / EVM packs, watch address, account list metadata, inject on/off, WC Reown project id you pasted.
- **Opt-in “local first-send count”** (Settings → About) — a counter in `localStorage` only. Off by default. Never networked.

## What the desk contacts (on purpose)

These are normal wallet jobs, not telemetry. You can often replace RPC/scan with your own URL in Settings.

| Contact | Why |
|---------|-----|
| Pulse / EVM **RPC** you selected | Balances, broadcast, gas |
| **PulseScan** (or your scan API) | Activity / approvals when you open those views |
| **DexScreener** (mainnet soft USD hints) | Optional price hints — never blocks send |
| **ethereum-lists / Chainlist** CDN | Resolve public RPCs when you Add a chain |
| **Reown / WalletConnect** relay | Only after you paste a project id and pair a site |
| **Trezor Suite** (local) | Device transport — SatoshiLabs software, not Perch |
| **Temper** (optional, default localhost) | Dry-run simulate if you turn that lab path on |

We do **not** send bag snapshots, seed material, or usage dashboards to a Perch backend. There is no Perch account server in this product.

## Chrome extension

See [extension/PRIVACY.md](./extension/PRIVACY.md). Same rule: relay to the desk; no phone-home from the pack.

## Screenshots / support

Dox shield (eye) blurs addresses on the face for share-safe screenshots. Never paste a seed into Discord/Telegram “support.” Issues: GitHub on this repo only.

## Changes

If we ever add networked telemetry, it must be **off by default**, documented here first, and opt-in in Settings — or it does not ship.
