# Try Pulse Perch (testnet)

**What this is:** a PulseChain wallet face for your Trezor — bag, send, approve, Sites — **without MetaMask**.  
**What you need:** Node 20+, Trezor Suite (desktop), a Trezor, ~10 minutes.

Lab defaults to **Pulse testnet (943)**. Use tiny test PLS only.

---

## 1. Run the desk

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

Sites that only look for MetaMask.

**Download:** [pulse-perch-extension-0.1.1.zip](https://github.com/ihelpmaybe/pulse-trezor/releases/download/extension-0.1.1/pulse-perch-extension-0.1.1.zip) (GitHub Release `extension-0.1.1`)

**SHA256:** `c36c25d20eb71b816e2a2ee1b24ce8472be1eb16e5eb9e3e92d13c9a30d4b394`  
([checksum file](https://github.com/ihelpmaybe/pulse-trezor/releases/download/extension-0.1.1/pulse-perch-extension-0.1.1.sha256))

1. Unzip the pack.
2. Chrome → Extensions → Developer mode → **Load unpacked** → that folder.
3. Run the desk (`npm run dev`) → **Connect** Trezor → keep the Perch tab open.

Or build locally: `npm run ext:pack` → `dist-ext/`. Prefer **Sites (WalletConnect)** when the dapp supports it.

Details: [extension/README.md](./extension/README.md)

---

## Guides

- [What works today](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md)
- [Trezor on Pulse](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/trezor-on-pulse.md)
- [Bridge → receive](https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/bridge-receive.md)

---

## Install as an app (optional)

Settings → **Install Pulse Perch** when Chrome/Edge offers it (localhost or HTTPS).  
Or: `npm run build && npm run preview`, then use the browser install icon.

## Honest limits

- Not official Trezor Pulse support. Suite still does not list Pulse.
- Mainnet spend is your call — this page is the **testnet** try path.
- No seed in the browser. Signs stay on the device via Suite.
- Fiat buy/sell = ProveX link, not custody inside Perch.
