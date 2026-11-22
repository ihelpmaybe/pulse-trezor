# Pulse Trezor — master todo

Goal: **full PulseChain ↔ Trezor** so users never need MetaMask/Rabby for day-to-day Pulse.

Legend: `[ ]` todo · `[~]` partial / exists elsewhere · `[x]` done

---

## Repo map

- [x] Private GitHub: `pulse-trezor` (desk)
- [x] Private GitHub: `hexican-rescue` (bunker)
- [x] Private GitHub: `pulse-trezor-guides` (docs/funnel)
- [ ] Decide later spin-outs (swap kit, claim tools) only if desk gets heavy

---

## A — Pulse Trezor Desk (Suite replacement)

### A0 — Bootstrap
- [ ] App shell (Vite + existing Connect patterns)
- [ ] Warm Connect + Bridge; human-readable device errors
- [ ] Connect / disconnect; show address matching device screen
- [ ] Pulse RPC + explorer links (369)

### A1 — Core custody
- [ ] Receive: show address, copy, verify-on-device
- [ ] PLS balance
- [ ] Send PLS (prepare → Trezor sign → broadcast)
- [ ] Pending / confirmed tx status
- [ ] Basic tx history (indexer or scan API)

### A2 — Tokens
- [ ] Token list: HEX, PLSX, INC, custom add-by-contract
- [ ] Token balances
- [ ] Send ERC-20
- [ ] Approve ERC-20 (clear UI: spender, amount, revoke)

### A3 — Accounts
- [ ] Multi-account BIP44 discovery (`m/44'/60'/0'/0/n`)
- [ ] Passphrase / hidden wallet callouts (docs link)
- [ ] Watch-only after disconnect (persisted registry)
- [ ] Export / import address registry JSON

---

## B — DeFi face (same desk)

- [ ] One swap venue (PulseX or Piteas or Switch) — quote → sign
- [ ] Slippage / deadline controls
- [ ] Second venue only after first is solid
- [ ] Liquidity / farm — later if demand

---

## C — HEX / stake companion

- [ ] Port / reuse `@hex/pqq-wallet` derivation + Connect adapter
- [ ] Discover stake-related addresses
- [ ] Portfolio view (stakes, liquid HEX)
- [ ] Stake / end / good-accounting flows with exact-path signing
- [ ] Claim / migrate power tools (from existing lab walks) behind “Advanced”

---

## D — Rescue / quantum-prep → `hexican-rescue`

- [ ] Deploy RescueRegistry (when ready)
- [ ] Thin register UI (EOA → bunker)
- [ ] Rebind / clear flows
- [ ] “Move liquid bag” checklist
- [ ] Emergency advocacy docs (Pulse/client cooperation)

---

## E — Power / migrate tools

- [ ] Portfolio snapshot helpers
- [ ] Cross-wallet migrate walks (lab → product)
- [ ] Fixture / e2e harness for Connect (CI-friendly fakes + manual device checklist)

---

## F — Guides → `pulse-trezor-guides`

- [ ] “PLS on Trezor without MetaMask”
- [ ] Bridge → receive on Trezor
- [ ] Passphrase / hidden wallet
- [ ] Safe vs Model T notes (Connect version / Suite mobile)
- [ ] Funnel: guide → desk download / URL

---

## G — Upstream / ecosystem (optional)

- [ ] Document Suite gap for users
- [ ] Upstream ask / PR for Suite Pulse visibility (nice-to-have; not blocking)

---

## H — Parked (explicit non-goals until revisited)

- [ ] Custom Trezor firmware
- [ ] On-device PQ (Dilithium / ML-DSA) — needs chain + SE support
- [ ] Full Suite fork redistribute (T-RSL)
- [ ] Ledger path (unknown; research only)

---

## Ship order (ROI)

1. A0 + A1 (connect, receive, PLS send)
2. A2 (HEX + PLSX)
3. A3 (multi-account + watch-only)
4. C thin (portfolio)
5. B one swap
6. D deploy + register UI
7. F guides in parallel as content
8. E advanced last

---

## Definition of “E2E done”

A Trezor user can: **receive PLS/tokens, see balances, send, swap once, manage HEX stakes, and register a bunker** — all without MetaMask/Rabby.
