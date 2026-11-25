# End-to-end acceptance (program)

Use this to judge whether todos actually close the loop.  
Detail lives in each repo’s `TODO.md`. This file = **user journeys + stack**.

Legend: **OK** = covered in some TODO · **GAP** = missing/weak · **OUT** = explicit non-goal for now

---

## A. User journeys

| Journey | Status | Where |
|---------|--------|--------|
| Install Bridge + Connect device | OK (thin) | Desk A0 · Guides G2 |
| Receive PLS on Trezor (verify on device) | OK | Desk A1 · Guides G1 |
| See PLS + token balances | OK | Desk A1–A2 · Tip exists |
| Send PLS / ERC-20 | OK | Desk A1–A2 · Tip |
| Approve / revoke spender | OK | Desk A2 |
| Swap once on **PulseX** | OK | Desk B · Tip |
| Fiat via **ProveX** (USDC) | GAP→now core | Desk/Tip deep link · guides |
| HEX stake portfolio + end stake | OK | Desk C |
| Use a Pulse dapp with Trezor | OK | Platform PLAT-WC |
| Phone soft wallet day-to-day | OK | Tip |
| Phone ↔ desktop same portfolio (watch-only) | OK | Platform SYNC · Tip TIP3 |
| Graphene / Linux / macOS / Win / Web | OK | Platform PLAT · Desk PLAT |
| Bridge ETH→Pulse then to Trezor | OK (docs) | Guides G1 |
| Register never-sign bunker + move bag | OK | hexican-rescue · Guides G4 |
| Passphrase / hidden wallet | OK | Desk A3 · Guides G1 |
| AI explains tx; user/Trezor signs | OK | Platform AI · Desk AI |
| MPC recover Tip if phone lost | OK (stretch) | Platform MPC · Tip TIP5 |
| Suite shows Pulse officially | OK (upstream) | Suite SU4 |
| Clearer device token screens | OK | Firmware FW2 |
| PQ on-device signatures | OUT until chain | Firmware FW5 |

### Gaps found in audit (must add to todos)

| Gap | Why it matters | Owner |
|-----|----------------|--------|
| **Fee / gas UI** (estimate, stuck tx, speed-up/cancel) | Can’t “finish” sends when fees move | Desk |
| **EIP-712 / typed data / Permit clear-sign** | Real DeFi beyond simple transfer | Desk |
| **Custom contract call** (data hex / ABI assist) | Power users / rescue / claim | Desk |
| **Indexer choice** (scan API vs self-host) for history | A1 history otherwise hand-wavy | Desk + Platform |
| **First-run: install Bridge** | E2E fails before Connect | Desk + Guides |
| **Firmware outdated warning** | Safe ops | Desk |
| **Tip backup verify** (seed check) | Soft wallet E2E | Tip |
| **Bulk revoke / approval inventory** | Safety after DeFi | Desk |
| **Address book** | Fewer wrong-send losses | Desk + Tip |
| **Fiat on/off-ramp pointers** (not custody) | Money-in journey | Guides |
| **Release / update channel** (Desk + Tip APK) | Users must get builds | Desk + Tip + Platform |
| **Security threat model + support path** | Program hygiene | Guides + Platform |
| **Testnet on Desk** | Dev/E2E without mainnet risk | Desk |
| **Master release checklist** | Cross-repo “ship” | This file § C |

---

## B. Stack layers

| Layer | Covered? |
|-------|----------|
| Firmware (sign 369, tokens, emu, PQ later) | Yes |
| Connect / Bridge | Yes (Desk/Tip2) |
| Suite study + upstream | Yes |
| Desk HWW product | Yes |
| Tip mobile soft | Yes |
| Sync Tip↔Desk | Yes |
| Multi-OS + Graphene + Apple/Linux | Yes |
| MPC optional | Yes |
| AI assist | Yes |
| Rescue / quantum-prep | Yes |
| Guides / funnel | Yes |
| EIP-681 extensions | Yes (platform P2) |

---

## C. “E2E done” gates (ship bars)

### Gate T — Tests (blocks every other Gate)
See **[TESTING.md](./TESTING.md)** — SMOKE · FUZZ · PEN · FULL.

- [x] Desk: smoke CI + pen report — `npm run smoke` + `tests/pen/REPORT.md` (2026-11-23+) · FULL matrix still OPEN  
- [ ] Tip: smoke + backup/seed pen  
- [ ] Platform SYNC: roundtrip smoke + seed-reject fuzz  
- [ ] Rescue: forge (+ fuzz) green; pen authz  
- [ ] Firmware: emu smoke matrix started  
- [ ] No Gate 1–3 ship with open **Critical** pen or red FULL row  

### Gate 1 — HWW without MetaMask
Desk detail / honesty table: **[docs/GATE-1-CHECKLIST.md](./docs/GATE-1-CHECKLIST.md)**.

- [x] Desk A0–A2 on Windows — Connect · bag · send · approve (lab 2026-11)  
- [x] Bridge / Suite first-run covered — FAQ + suite-allow (Connect 10)  
- [x] Receive / send PLS + HEX/PLSX — 943 dust PASS; mainnet WC spend still soft  
- [~] Fee UI + basic history — UI + Anvil RBF PASS; **device** stuck-tx OPEN  
- [~] Sites WC pair smokes (PulseX/HEX/ProveX/Piteas) — **session only**, not Signed PASS  
- [~] **Gate T** green for Desk — CI/pen PASS; FULL OS×device OPEN  


### Gate 2 — Mobile↔desktop
- [ ] Tip TIP0–TIP1 + SYNC1–SYNC2  
- [ ] Graphene guide  
- [ ] Shared bunker link  
- [ ] **Gate T** green for Tip + SYNC  

### Gate 3 — Full program stack
- [ ] Desk Lin/Mac/Web + WC  
- [ ] Rescue deployed + UI  
- [ ] FW0–FW3 lab green  
- [ ] Suite gap mapped + SU4 filed  
- [ ] AI0–AI1 live (optional but tracked)  
- [ ] **FULL matrix** for Desk + Tip primary OS  

### Gate 4 — Stretch
- [ ] MPC2 Tip recovery (+ MPC pen)  
- [ ] iOS  
- [ ] Official Suite Pulse  
- [ ] PQ firmware  

---

## Verdict

**Program shape is end-to-end** across custody → device → apps → sync → OS → safety → Suite/FW · **tests**.  
Gaps from journey audit + **smoke/fuzz/pen/full** bars are on every repo `TODO.md`.
