# End-to-end PulseChain ↔ Trezor

What “everything” means, layer by layer. This is the program map for all private repos.

## Stack (bottom → top)

```
Keys / Secure Element
        ↑
Firmware (GPL) — ethereum app, networks, tokens, on-device review
        ↑
Bridge / WebUSB / Suite-hosted Connect transport
        ↑
Connect API  — derive, ethereumSignTransaction, typed data, …
        ↑
┌───────────────────┬────────────────────┬─────────────────┐
│ Official Suite    │ Pulse Desk (ours)  │ MM / Rabby      │
│ (T-RSL, no Pulse) │ shippable product  │ today’s path    │
└───────────────────┴────────────────────┴─────────────────┘
        ↑
PulseChain 369 — RPC, tokens, HEX, DEX, bunker, bridge
```

Today: **firmware can sign Pulse**; **Suite does not show Pulse**; users bounce through MetaMask/Rabby.  
E2E goal: every layer we control is Pulse-aware, and users can live without MetaMask.

---

## Layer 0 — Chain / protocol (Pulse)

| Need | Notes |
|------|--------|
| RPC + explorer | `rpc.pulsechain.com`, scan.pulsechain.com |
| Native PLS + ERC-20 | HEX, PLSX, INC, custom |
| DeFi | PulseX / Piteas / Switch |
| HEX stakes | Protocol + our companion UX |
| Bridge in/out | Guide + receive on Trezor address |
| Quantum-prep | Never-sign bunker (registry) until PQ exists on-chain |

We do not invent a new L1. We productize custody + UX on 369.

---

## Layer 1 — Firmware (`pulse-trezor-firmware`)

**License:** GPL-3 — fork / modify / redistribute OK if GPL obligations met.  
**Reality check:** PulseChain (`chain_id=369`, shortcut PLS) is **already** in upstream `networks` defs. Signing Pulse txs on Safe 3/5/7 works via Connect.

### Why still own a firmware track
1. **Token defs / clearer device screens** for Pulse HEX, PLSX, etc.
2. **Lab builds** (emulator + device) for Pulse signing regression
3. **Upstream PRs** back to SatoshiLabs when useful
4. **Long-term PQ research** (only when chain + SE path exists — not v1)
5. Optional Pulse-specific UX copy on-device (“PulseChain” labeling polish)

### Rules (don’t pretend)
- Custom FW is **lab / advanced** unless signed the same way as official.
- Never market unsigned FW as “Trezor official.”
- Emulator = same Connect → Bridge → device path as production.

### Firmware work packages
- FW0 Mirror upstream + document Pulse entry points (`common/defs/ethereum`, `make gen`)
- FW1 Audit Pulse network + support matrix per model
- FW2 Pulse token pack (HEX/PLSX/…) in token defs → better sign UI
- FW3 Emulator e2e: Connect sign Pulse PLS + ERC-20
- FW4 Upstream PR cadence
- FW5 PQ research spike (parked until chain accepts non-ECDSA)

---

## Layer 2 — Connect transport

Connect lives in the **Suite monorepo** (`@trezor/connect*`). Coin defs for Suite/Connect: `packages/connect-data/files/coins-eth.json` (no longer auto-synced from firmware).

Desk uses published `@trezor/connect-web` against official Bridge — **no Suite fork required to ship**.

Suite-enabling Pulse later needs: Pulse row in `coins-eth.json` + Suite network enable + **backend** (Blockbook-class or Suite’s ETH backend path for EVM). That is Suite-track work, not Desk-blocking.

---

## Layer 3 — Suite track (`pulse-trezor-suite`)

**License:** T-RSL — reference / interoperability; **no redistribute** of Suite outside the company.  
So this repo is **private study + patch notes + upstream asks**, not a public “Pulse Suite” download.

### Three parallel Suite strategies
| ID | Strategy | Ship to users? |
|----|----------|----------------|
| S1 | Private map: where Pulse plugs into Suite (coins-eth, networks UI, backends) | No — internal |
| S2 | Upstream: ask/PR SatoshiLabs to enable Pulse in official Suite | Yes if they merge |
| S3 | Pulse Desk = “Suite for Pulse” under our license | **Yes — primary** |

S3 is how end users get Suite-like UX without T-RSL violation.  
S1/S2 still run so we know exact gaps and can push Trezor.

### Suite work packages
- SU0 Clone/reference tree private; LICENSE + “no redistribute” banner
- SU1 Find Pulse (or absence) in `coins-eth.json` + Suite network list
- SU2 Document backend requirement (Blockbook / ETH indexer for 369)
- SU3 Spike: local-only Pulse enable (dev machine only)
- SU4 Upstream issue/PR package for official Pulse
- SU5 Feature parity checklist vs Desk (receive/send/tokens/history)

---

## Layer 4 — Pulse Desk (`pulse-trezor`) — shippable Suite replacement

Real Connect + Bridge. This is the product that makes E2E true for users **now**.

| Epic | Outcome |
|------|---------|
| A0–A1 | Connect, receive, PLS send |
| A2 | Tokens + approve |
| A3 | Multi-account + watch-only |
| B | One swap |
| C | HEX companion |
| E | Migrate / power tools |

**E2E Desk done:** no MetaMask needed for custody + one DeFi action + HEX view.

---

## Layer 5 — Safety / quantum-prep (`hexican-rescue`)

ECDSA stays. Prep = **never-sign bunker** + move liquid bag.  
Firmware PQ is Layer 1 FW5 — years/research, not a Desk dependency.

---

## Layer 6 — Guides / funnel (`pulse-trezor-guides`)

Teach Bridge → Desk, passphrase, device models; funnel into Desk.  
Also document “Suite doesn’t support Pulse yet; use Desk / upstream status.”

---

## Repo map (private)

| Repo | Layer | Role |
|------|-------|------|
| `pulse-trezor-firmware` | 1 | GPL fork / tokens / emu / PQ research |
| `pulse-trezor-suite` | 3 | T-RSL reference; mapping; upstream pack; **no public redistribute** |
| `pulse-trezor` | 4 | Ship Desk + master ROADMAP |
| `hexican-rescue` | 5 | Bunker registry |
| `pulse-trezor-guides` | 6 | Docs / funnel |

---

## Dependency order (honest E2E)

```
FW already signs Pulse ──┐
                         ├──► Desk A0–A2 ──► users leave MetaMask
Suite S1 map (parallel) ─┘         │
                                   ▼
                         Desk B + C + Rescue
                                   │
                    Suite S2 upstream (slow win)
                                   │
                         FW2 tokens / FW3 emu harden
                                   │
                              FW5 PQ (later)
```

**Critical path for “feels like Suite for Pulse”:** Desk A → B → C.  
**Critical path for “we own the full stack”:** Firmware repo + Suite study + Desk, in parallel.  
**Critical path for “official Suite has Pulse”:** S2 only (out of our hands).

---

## Definition of program “E2E done”

1. **User path:** Trezor → Desk → PLS/tokens/send/swap/HEX/bunker — no MetaMask.  
2. **Firmware path:** Private FW repo builds; Pulse tokens clearer on device; emu CI green.  
3. **Suite path:** Gap fully mapped; upstream ask filed; Desk covers parity meanwhile.  
4. **Safety path:** Rescue deployed + register UI.  
5. **Docs path:** Guides published for the above.

Quantum hardware signatures are **stretch**, not required for (1)–(4).
