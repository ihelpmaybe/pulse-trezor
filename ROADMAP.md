# Pulse Trezor — master todo (full stack)

Goal: **end-to-end PulseChain ↔ Trezor** — Desk users ship now; Suite + firmware tracks owned in parallel.

See [END-TO-END.md](./END-TO-END.md) for layer map and dependencies.

Legend: `[ ]` todo · `[~]` partial · `[x]` done

---

## Repo map

- [x] `pulse-trezor` — Desk + master docs
- [x] `hexican-rescue` — bunker / quantum-prep
- [x] `pulse-trezor-guides` — normie docs
- [x] `pulse-trezor-suite` — Suite reference / upstream (T-RSL, private)
- [x] `pulse-trezor-firmware` — firmware fork / tokens / emu (GPL)

---

## SUITE — official Suite track → `pulse-trezor-suite`

Constraint: **T-RSL** — study + local spike + upstream; do **not** redistribute Suite binaries/source publicly.

- [ ] SU0 Private repo + LICENSE banner (no redistribute)
- [ ] SU1 Map Pulse absence in `coins-eth.json` + Suite Networks UI
- [ ] SU2 Document backend needs (indexer / Blockbook-class for 369)
- [ ] SU3 Local-only spike: enable Pulse in Suite on a lab machine
- [ ] SU4 Upstream issue/PR pack for SatoshiLabs
- [ ] SU5 Parity checklist: Suite features vs Desk

---

## FIRMWARE — device track → `pulse-trezor-firmware`

Constraint: **GPL-3** OK to fork. Pulse network already upstream. Unsigned builds = lab only.

- [ ] FW0 Private mirror of `trezor-firmware` + build docs
- [ ] FW1 Audit Pulse (`chain_id` 369) + per-model support
- [ ] FW2 Pulse token pack (HEX, PLSX, …) for clearer sign UI
- [ ] FW3 Emulator e2e: Connect → sign PLS + ERC-20
- [ ] FW4 Upstream PRs when we improve defs
- [ ] FW5 PQ research spike (parked until chain accepts non-ECDSA)

---

## A — Pulse Trezor Desk (shippable “Suite for Pulse”)

### A0 — Bootstrap
- [ ] App shell (Vite + Connect patterns)
- [ ] Warm Connect + Bridge; human-readable errors
- [ ] Connect / disconnect; address matches device
- [ ] Pulse RPC + explorer (369)

### A1 — Core custody
- [ ] Receive + verify-on-device
- [ ] PLS balance
- [ ] Send PLS (prepare → sign → broadcast)
- [ ] Tx status + basic history

### A2 — Tokens
- [ ] HEX, PLSX, INC, custom contract
- [ ] Balances / send ERC-20 / approve+revoke

### A3 — Accounts
- [ ] BIP44 multi-account
- [ ] Passphrase callouts
- [ ] Watch-only registry + export/import JSON

---

## B — DeFi face

- [ ] One swap venue (quote → Trezor sign)
- [ ] Slippage / deadline
- [ ] Second venue later

---

## C — HEX companion

- [ ] Reuse pqq-wallet derivation + Connect adapter
- [ ] Portfolio / stake / end / good-accounting
- [ ] Advanced claim/migrate tools

---

## D — Rescue → `hexican-rescue`

- [ ] Deploy RescueRegistry
- [ ] Register / rebind / clear UI
- [ ] Move-bag checklist + emergency docs

---

## E — Power tools

- [ ] Portfolio snapshot
- [ ] Migrate walks → product
- [ ] Connect e2e harness (fake + device checklist)

---

## F — Guides → `pulse-trezor-guides`

- [ ] PLS without MetaMask (Desk)
- [ ] Bridge → Trezor receive
- [ ] Passphrase / hidden wallet
- [ ] Device / Connect version notes
- [ ] Suite status + upstream link
- [ ] Funnel → Desk

---

## G — Ecosystem

- [ ] Public writeup of Suite gap (optional)
- [ ] Coordinate SU4 upstream with firmware token PRs

---

## Ship order (full program)

**Wave 1 — users leave MetaMask**  
1. Desk A0 + A1  
2. Desk A2 (HEX/PLSX)  
3. Guides F (thin)

**Wave 2 — own the stack**  
4. Firmware FW0–FW1 (mirror + audit)  
5. Suite SU0–SU2 (map + backend notes)  
6. Desk A3 + C thin

**Wave 3 — depth**  
7. Desk B swap + D rescue deploy  
8. Firmware FW2–FW3 tokens + emu  
9. Suite SU3–SU4 spike + upstream  
10. E power tools · FW5 PQ later

---

## Definitions of done

| Bar | Meaning |
|-----|---------|
| **User E2E** | Desk: receive/send/tokens/swap/HEX/bunker — no MetaMask |
| **Stack E2E** | User E2E + FW repo building + Suite gap mapped + upstream filed |
| **Official Suite E2E** | Trezor ships Pulse in Suite (out of our control; SU4) |
| **Quantum E2E** | Stretch: chain + device PQ — not required for User/Stack E2E |
