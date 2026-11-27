# Try Pulse Perch (builders / testnet)

**No Node?** use **[INSTALL.md](./INSTALL.md)** — Windows zip → `Open-Pulse-Perch.cmd` (localhost). GitHub Pages is showcase only (no Connect).

**What this is:** a PulseChain wallet face for your Trezor — bag, send, approve, Sites — **without MetaMask**.  
**What you need for this page:** Node 20+, Trezor Suite (desktop), a Trezor, ~10 minutes.

**Privacy:** no phone-home · no seed in the browser · [PRIVACY.md](./PRIVACY.md) · [SECURITY.md](./SECURITY.md).

Lab defaults to **Pulse testnet (943)**. Use tiny test PLS only.

---

## 1. Run the desk (dev)

```bash
git clone https://github.com/ihelpmaybe/pulse-trezor.git
cd pulse-trezor
npm run setup
npm run dev
```

Open **http://127.0.0.1:5174/**

---

## 2. Host the device

1. Open **Trezor Suite** (desktop) and unlock the device.
2. Leave Suite running — Connect talks to it (not MetaMask).

---

## 3. Connect in Perch

1. In Perch, hit **Connect**.
2. Allow the request in Suite.
3. Confirm the address on the Trezor screen matches the desk.

---

## 4. Smoke (optional)

| Step | Do |
|------|----|
| Bag | Load balances on testnet **943** |
| Send | Tiny test PLS send → confirm on device |
| Approve | Approvals tab → one spender → confirm on device |
| Sites | Paste a free [Reown Cloud](https://cloud.reown.com/) project id → WalletConnect a Pulse dapp |

Get test PLS from a Pulse testnet faucet if the bag is empty.

---

## Chrome extension (optional lab)

Sites that only look for MetaMask. Prefer **Sites (WalletConnect)** when the dapp supports it.

**Preferred:** build current **0.1.5** locally:

```bash
npm run ext:pack
```

Then Chrome → Extensions → Developer mode → **Load unpacked** → `dist-ext/pulse-perch-extension/` (or the unzipped pack). Keep the Perch tab + Suite up — cold desk does not fake accounts.

Older GitHub release zip (`extension-0.1.2`) still exists but is behind the no-theater pack.

Details: [extension/README.md](./extension/README.md)

---

## Guides

- [What works today](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md)
- [Trezor on Pulse](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/trezor-on-pulse.md)
- [Bridge → receive](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/bridge-receive.md)

---

## Install as an app (optional)

Prefer the live HTTPS desk ([INSTALL.md](./INSTALL.md)) so Chrome/Edge can offer **Install Pulse Perch**.  
Dev: `npm run build && npm run preview`, then the browser install icon.

## Ship surfaces (honest)

- **End-user:** GitHub Pages + Releases zip (`Open-Pulse-Perch.cmd`) — [INSTALL.md](./INSTALL.md).
- **Desk pack:** `npm run build && npm run desk:pack` → unsigned web zip + SHA.
- **Extension:** Load unpacked / sideload zip only. **Chrome Web Store and Play listing are not a goal.**

## Honest limits

- Not official Trezor Pulse support. Suite still does not list Pulse.
- Mainnet spend is your call — this page is the **testnet** try path.
- No seed in the browser. Signs stay on the device via Suite.
- Fiat buy/sell = ProveX link, not custody inside Perch.
