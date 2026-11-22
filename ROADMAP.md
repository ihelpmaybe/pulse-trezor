# Pulse Trezor — master todo (full stack)

Goal: **end-to-end PulseChain ↔ Trezor** — Desk users ship now; Suite + firmware tracks owned in parallel.

See **[PRIORITY.md](./PRIORITY.md)** (ranked build queue) · [END-TO-END.md](./END-TO-END.md) · [ACCEPTANCE.md](./ACCEPTANCE.md) · [TESTING.md](./TESTING.md) · [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md).

---

## TEST — all repos (Gate T)

Program standard: [TESTING.md](./TESTING.md). Each repo TODO has a TEST section.

- [ ] Desk smoke/fuzz/pen/full  
- [ ] Tip smoke/fuzz/pen/full  
- [ ] Platform SYNC + MPC + AI test bars  
- [ ] hexican-rescue forge + fuzz + pen  
- [ ] Firmware emu smoke + matrix  
- [ ] Suite: redistribute pen + parity vs Desk FULL  
- [ ] Guides: link-check + scam-copy pen  
- [ ] CI smoke + fuzz on every code repo  
- [ ] Pen report required before release tags  
- [ ] ACCEPTANCE Gate T blocks Gate 1–3

Legend: `[ ]` todo · `[~]` partial · `[x]` done

---

## Repo map

- [x] `pulse-trezor` — Desk + master docs (HWW)
- [x] [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) — mobile soft Pulse (public; EIP-681 / PulseX)
- [x] `hexican-rescue` — bunker / quantum-prep
- [x] `pulse-trezor-guides` — normie docs
- [x] `pulse-trezor-suite` — Suite reference / upstream (T-RSL, private)
- [x] `pulse-trezor-firmware` — firmware fork / tokens / emu (GPL)
- [x] `pulse-trezor-platform` — sync · multi-OS · MPC · AI

---

## PLATFORM — sync / OS / MPC / AI → `pulse-trezor-platform`

Full checklist lives in that repo’s [TODO.md](https://github.com/ihelpmaybe/pulse-trezor-platform/blob/main/TODO.md). Summary:

- [ ] **SYNC** Tip↔Desk watch-only + QR pair + shared tokens/RPC/bunker
- [ ] **PLAT** Win · Android · Graphene · Linux · macOS · Web/PWA → then Ext/WC → iOS
- [ ] **MPC** Survey + 2-of-2 Tip recovery spike (not Trezor keys)
- [ ] **AI** Explain/prepare txs + MCP reads (never custody)

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

## TIP — Tip Wallet (mobile soft) → [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet)

Existing product. Do **not** rebuild soft mobile inside Desk.

- [ ] TIP0 Locate full Tip source; decide if GH stays face-only or gets code
- [ ] TIP1 Align RPC / token list / safety copy with Desk
- [ ] TIP2 Optional Trezor Connect on Android (after Desk A1)
- [ ] TIP3 Cross-links: bunker, guides, same receive-address story
- [ ] TIP4 Distribution (sideload → Play) — separate from HWW

---

## A — Pulse Trezor Desk (shippable “Suite for Pulse” / HWW)

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

## B — DeFi face (PulseX + ProveX)

- [ ] **PulseX** swap (quote → Trezor sign)
- [ ] Slippage / deadline
- [ ] **ProveX** fiat↔USDC deep links + clear-sign
- [ ] Other DEXes — BONUS only

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

## GROWTH — adoption (software that pulls people to Pulse)

See [ADOPTION.md](./ADOPTION.md). After Gate 1 smoke — don’t ads-before-product.

### P0
- [ ] “Trezor on Pulse” landing (Suite gap → Desk)
- [ ] Bridge → Desk receive 1-click / guided flow
- [ ] EIP-681 pay links default to Tip (creators/merchants)
- [ ] Graphene / de-Google Tip story + checksums
- [ ] Watch-only Desk for Tip users (SYNC)
- [ ] Bunker narrative (honest quantum-prep)
- [ ] WalletConnect “Open in Pulse Desk” for dapps
- [ ] “Works on Pulse” badge / deep-link kit

### P1
- [ ] Migrate-from-ETH wizard (same-addr risk + checklist)
- [ ] HEX companion as destination app
- [ ] Creator tip kit (QR + 681)
- [ ] Status page: what works today
- [ ] Locales after English
- [ ] Obtainium / F-Droid install docs

### P2+ / BONUS (filed on owning repos — after Gate 1–2)
- [ ] ProveX guides + CEX snippets → **guides** (ProveX = core, not bonus)
- [ ] iOS · PWA · locales → **Tip / Desk BONUS**
- [ ] Ledger / Safe / AA research → **platform BONUS** (go/no-go)
- [ ] 681 Chrome/Android funnel → **platform BONUS**
- [ ] AI explain-before-sign → Tip/Desk when AI0–AI3 ready
- [ ] Extra FW tokens / PQ → **firmware BONUS**

### Avoid
- Fake “official Suite” · custodial easy mode · points farms before product · MetaMask/Rabby clones · Keystone sprawl

---

## Ship order (full program)

**Wave 1 — leave MetaMask + Tip soft + sync foundation**  
0. **SYNC0 + SYNC4 stubs first** (shared schema/token pack — stops Tip/Desk divergence)  
1. Desk A0 + A1 (Windows first)  
2. Desk A2 + TIP0–TIP1 (consume shared pack)  
3. SYNC1–SYNC3 (registry/QR/bunker)  
4. Guides: Tip · Desk · Graphene sideload  
*(Efficiency: shared pack before per-app lists — see BUILD-EFFICIENCY.md)*  

**Wave 2 — multi-OS + stack ownership**  
5. Desk Linux + macOS + Web/PWA  
6. Firmware FW0–FW1 · Suite SU0–SU2  
7. Desk A3 + C thin · PLAT-Ext/WC  

**Wave 3 — depth**  
8. Desk B + Rescue D · AI0–AI2  
9. FW2–FW3 · Suite SU3–SU4 · MPC0–MPC2 spike  
10. TIP2 Trezor-on-Tip · iOS · deeper MPC/AI · FW5 PQ  

---

## Definitions of done

| Bar | Meaning |
|-----|---------|
| **User E2E** | Desk HWW custody without MetaMask |
| **Mobile↔Desktop E2E** | Tip + Desk share watch-only portfolio + bunker (SYNC) |
| **Platform E2E** | Win + Android/Graphene + Lin + Mac (+ Web) |
| **Stack E2E** | + FW building + Suite gap mapped + upstream filed |
| **AI E2E** | Agent explains/prepares; device or human signs |
| **MPC E2E** | Optional Tip recovery path live (stretch) |
| **Official Suite E2E** | Trezor ships Pulse (out of our control) |
| **Quantum E2E** | Stretch PQ — not required above |
