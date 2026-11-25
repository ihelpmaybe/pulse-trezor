# Install Pulse Perch (no coding)

**What you get:** a PulseChain wallet face for your **Trezor** — without MetaMask.  
**What you still need:** [Trezor Suite](https://suite.trezor.io/) unlocked on this PC, and a real Trezor.

Privacy: [PRIVACY.md](./PRIVACY.md) · Security: [SECURITY.md](./SECURITY.md). No seed in the browser.

---

## Option A — Open in the browser (easiest)

1. Open the live desk: **https://ihelpmaybe.github.io/pulse-trezor/**
2. (Optional) Chrome/Edge → install icon / **Install Pulse Perch** so it opens like an app.
3. Unlock **Trezor Suite** → in Perch hit **Connect** → Allow in Suite → confirm the address on the device.

That’s it. Updates: refresh the page (or reinstall the PWA after a release).

---

## Option B — Windows zip (offline-friendly)

1. Download **`pulse-perch-*-web.zip`** from [Releases](https://github.com/ihelpmaybe/pulse-trezor/releases).
2. Check the `.sha256` file if you want (optional but wholesome).
3. Unzip → double-click **`Open-Pulse-Perch.cmd`**.
4. Leave the black window open. Browser opens **http://127.0.0.1:5174/**.
5. Unlock Suite → **Connect** → confirm on device.

---

## Option C — Builders (Node)

See [TRY.md](./TRY.md): `npm run setup` · `npm run dev`.

---

## After you’re in

| Do | How |
|----|-----|
| Practice safely | Switch to **testnet 943** and use faucet dust |
| Pair a dapp | **Apps** (WalletConnect) — paste a free [Reown](https://cloud.reown.com/) project id once |
| MetaMask-only sites | Optional lab extension — sideload from Releases / `npm run ext:pack` (not Chrome Web Store) |

## Honest limits

- Not official Trezor Pulse support.
- Suite must stay open to sign.
- Mainnet spend is your call — practice on testnet first.
- We don’t phone home; see PRIVACY.md.
