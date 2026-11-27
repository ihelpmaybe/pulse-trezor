# Install Pulse Perch (no coding)

**What you get:** a PulseChain wallet face for your **Trezor** — without MetaMask.  
**What you still need:** [Trezor Suite](https://suite.trezor.io/) unlocked on this PC, and a real Trezor.

Privacy: [PRIVACY.md](./PRIVACY.md) · Security: [SECURITY.md](./SECURITY.md). No seed in the browser.

**GitHub Pages is a showcase peek only** — look at the UI there; do **not** Connect a Trezor on `*.github.io`. Wallet stays on **your machine** (zip or localhost).

---

## Option A — Windows zip (preferred)

1. Download **`pulse-perch-*-web.zip`** from [Releases](https://github.com/ihelpmaybe/pulse-trezor/releases).
2. Check the `.sha256` file if you want (recommended).
3. Unzip → double-click **`Open-Pulse-Perch.cmd`**.
4. Leave the black window open. Browser opens **http://127.0.0.1:5174/**.
5. Unlock Suite → **Connect** → confirm on device.

---

## Option B — Builders (Node)

See [TRY.md](./TRY.md): `npm run setup` · `npm run dev` → **http://127.0.0.1:5174/**

---

## Showcase peek (no wallet)

https://ihelpmaybe.github.io/pulse-trezor/ — read-only look at the desk chrome. Connect is disabled there on purpose.

---

## After you’re in (local only)

| Do | How |
|----|-----|
| Practice safely | Switch to **testnet 943** and use faucet dust |
| Pair a dapp | **Apps** (WalletConnect) — paste a free [Reown](https://cloud.reown.com/) project id once · allowlist **localhost** only |
| MetaMask-only sites | Optional lab extension — sideload from Releases / `npm run ext:pack` (not Chrome Web Store) |

## Honest limits

- Not official Trezor Pulse support.
- Suite must stay open to sign.
- Mainnet spend is your call — practice on testnet first.
- We don’t phone home; see PRIVACY.md.
