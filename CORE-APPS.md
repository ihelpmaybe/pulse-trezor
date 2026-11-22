# Core apps (product focus)

This program is **not** a generic multi-chain wallet.  
Custody (Tip + Desk/Trezor) exists to make these four work end-to-end on **PulseChain**:

| # | App | Role | Desk/Tip job |
|---|-----|------|----------------|
| 1 | **PulseChain** | L1 (369) — PLS, gas, accounts | Receive/send PLS, RPC, fees, history |
| 2 | **HEX** | Time-deposit / stakes | Balances, stake companion, clear-sign stake txs |
| 3 | **PulseX** | Primary DEX (incl. V2) | Swap quote → Trezor/Tip sign (first-class) |
| 4 | **ProveX** ([provex.com](https://app.provex.com/) / docs) | Fiat ↔ USDC on Pulse (P2P escrow) | Deep links, WC/guide, USDC in token pack, clear-sign escrow txs |

Secondary tokens that support the core loop: **PLSX**, **INC**, **USDC** (ProveX), WPLS as needed.

## Out of core (don’t prioritize)

- Piteas / Switch / 9mm as first swap (optional later)  
- Random PRC-20 casino  
- Multi-chain portfolio clouds  
- Generic “every DeFi protocol”  

## Agent rule

Feature PRs should answer: **which of PulseChain / HEX / PulseX / ProveX does this improve?**  
If none — deprioritize unless PRIORITY says BONUS.

## Sync with PRIORITY

| Core app | Primary PRIORITY rows |
|----------|----------------------|
| PulseChain | #3–6, #9–11 (Desk custody) |
| HEX | #9 tokens, #24 companion |
| PulseX | #25 Desk B · Tip already swaps |
| ProveX | guides/fiat + Desk deep link + USDC in SYNC4 · WC if needed |
