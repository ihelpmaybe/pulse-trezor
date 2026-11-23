# Pulse Perch — browser extension (lab)

Cross-origin `window.ethereum` for sites that only look for MetaMask.

## Load unpacked
1. `npm run dev` (Perch on Vite, usually `:5173` / `:5174`)
2. Chrome → Extensions → Developer mode → **Load unpacked** → this `extension/` folder
3. Open Perch → Connect Trezor → Settings → enable this-tab inject if needed
4. Open a Pulse dapp → Connect wallet should see Perch

## Smoke checklist (manual)
- [ ] Extension loads without errors (service worker / background)
- [ ] Perch tab open + Connect shows address
- [ ] Dapp `eth_requestAccounts` returns Perch account
- [ ] `eth_chainId` matches desk (369 / 943)
- [ ] `personal_sign` prompts Trezor / Suite
- [ ] `eth_signTypedData_v4` prompts Trezor (desk path wired)
- [ ] `eth_sendTransaction` dust → device confirm → broadcast
- [ ] `wallet_switchEthereumChain` to unsupported chain rejects
- [ ] Closing Perch tab makes signs fail honestly (no fake success)

## Flow
dapp → `inpage.js` → content → background → Perch tab `perch-bridge.js` → EIP-1193 host → Connect/Suite/device

## Limits
- Perch desk tab must stay open for signs
- Not store-ready — lab shell only
- Prefer Sites (WalletConnect) when the dapp supports it
