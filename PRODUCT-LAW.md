# PRODUCT LAW — Pulse Perch

**Pulse Perch** is a **MetaMask replacement for PulseChain**.

## Naming (forward)

| Layer | Name | Rule |
|-------|------|------|
| **Product (public)** | **Pulse Perch** | What users see. Entitled-cute; our spot on Pulse. No Suite / Desk / vendor lock-in. |
| **Transport (internal)** | Trezor Connect → Suite *today* | Swappable. May become another HWW / bridge later. Do not put the transport brand in the product name. |
| **Operator tooling** | Desk | Vault/TTS operator board only — not this product’s public name. |

Code/package ids may still say `pulse-trezor` / `PulseTrezor` — those are internals. Face copy + WC peer + Suite Allow title = **Pulse Perch**.

## Definition of done

A user can do normal Pulse life (**bag, send, approve, swap, connect to Pulse sites, sign**) **without MetaMask installed**.

Opening PulseX / HEX / ProveX in a browser is fine. Reinstalling or depending on **MetaMask** is not. Sites connect to **Pulse Perch**; it signs on the current transport (Trezor today).

## Forbidden

- Shipping “custody only” and calling the job done
- Pushing users back to MetaMask for swaps / connects
- App-directory link spam as a substitute for wallet capability
- Hiding WalletConnect / site-connect because the UI copy was annoying — **fix the UX, don’t delete the capability**
- Naming the product after a transport you’ll replace (Suite / “Desk”)

## Required stack (prefer existing)

1. Signing transport: Trezor Connect 10 → Suite *for now* (dont-pretend) — replaceable later
2. Site connect: WalletConnect (or injected provider) so PulseX / HEX / ProveX talk to Pulse Perch, not MetaMask
3. In-desk actions: send, approve. Optional convenience DEX UIs later — **not** a substitute for site-connect
4. RPC + balances stay on face

**MetaMask replacement = Sites (WalletConnect to any dapp) + custody/sign.**  
A single PulseX button is **not** a MetaMask replacement.

**EVM peers:** Same BIP44 eth path + tx type work on other EVMs (ETH / Sepolia / Holesky + Pulse test). Pulse daily life stays the product center; extra chains exist so Sites/dapps that switch networks don’t bounce.

## Agent rule

When the operator says “make it usable / finish the app / MetaMask replacement,” implement toward **this law** — do not redefine success as send + approve only.
