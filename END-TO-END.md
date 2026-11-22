# End-to-end PulseChain ↔ Trezor

What “everything” means, layer by layer. This is the program map for all private repos.

## Stack (bottom → top)

```
                    ┌── AI / agents (explain · prepare · MCP reads — never keys)
                    │
Keys / SE ──────────┼──────── Soft keys (Tip) ──── optional MPC recovery
   ↑                │              ↑
Firmware            │         Android · Graphene · (iOS later)
   ↑                │              │
Bridge/Connect ─────┤         EIP-681 · PulseX
   ↑                │              │
┌───┴────┬──────────┴───┬──────────┴────┬────────────┐
│ Suite  │ Pulse Desk   │ Tip mobile    │ Ext/WC/PWA │
│ (gap)  │ Win·Lin·Mac  │ soft + sync   │ EIP-681    │
└────────┴──────┬───────┴───────┬───────┴────────────┘
                └──── SYNC ─────┘  watch-only · bunker · tokens
                        ↓
              PulseChain 369
```

**E2E** = every client we ship can share portfolio/bunker story; HWW signs on Trezor; Tip covers phone; AI assists; MPC optional for soft recovery — not a second Suite.

---

## Layer 0 — Chain / protocol (Pulse)

| Need | Notes |
|------|--------|
| RPC + explorer | `rpc.pulsechain.com`, scan.pulsechain.com |
| Native PLS + ERC-20 | HEX, PLSX, INC, custom |
| DeFi | **PulseX** (core) |
| Fiat | **ProveX** USDC P2P ramp (core) |
| HEX stakes | Protocol + our companion UX (core) |
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

## Layer 4 — Pulse Desk (`pulse-trezor`) — shippable Suite replacement (HWW)

Real Connect + Bridge. Desktop/hardware path that makes HWW E2E true **without MetaMask**.

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

## Layer 4b — Tip Wallet ([Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet)) — mobile soft

**Already exists** (public stub repo + sideload Android product). PulseChain-first, Rabby Mobile lineage.

| Has today | Explicitly not (yet) |
|-----------|----------------------|
| EIP-681 scan/pay QRs | Hardware wallets |
| Send / receive on 369 | WalletConnect / website connect |
| PulseX swap (0% Tip fee) | Multi-chain portfolio clouds |
| Seed / key backup on phone | |

### How Tip fits the program
- **Soft mobile** lane = Tip (don’t rebuild a second phone soft wallet in Desk).
- **Hardware** lane = Desk (and later optional Tip←Trezor Connect on Android).
- Guides funnel: phone → Tip; Trezor on PC → Desk.
- Shared: Pulse RPC, token lists, EIP-681, bunker register, brand/safety copy.
- Related EIP-681 work also lives in `Internetmoney681-Android` / `Internetmoney681-Chrome` — reuse patterns, don’t fork thrice.

### Tip work packages (link from this program)
- TIP0 Confirm where full Tip source lives; keep `Tip-wallet` as public face or monorepo home
- TIP1 Align token list / RPC with Desk
- TIP2 Optional: Trezor Connect on Android (Safe 7 / Suite mobile flow) — after Desk A1 solid
- TIP3 Deep link Desk↔Tip (same receive address story, bunker, guides)
- TIP4 Play listing / distribution (separate from HWW)

---

## Layer 5 — Safety / quantum-prep (`hexican-rescue`)

ECDSA stays. Prep = **never-sign bunker** + move liquid bag.  
Firmware PQ is Layer 1 FW5 — years/research, not a Desk dependency.

---

## Layer 6 — Guides / funnel (`pulse-trezor-guides`)

Teach Bridge → Desk, passphrase, device models; funnel into Desk.  
Also document “Suite doesn’t support Pulse yet; use Desk / upstream status.”

---

## Platforms (ROI)

| Platform | Vehicle | Priority |
|----------|---------|----------|
| Windows | Desk | P1 |
| Android | Tip | P1 (exists) |
| GrapheneOS | Tip sideload | P1 (privacy ROI) |
| Linux | Desk | P1 |
| macOS (Apple) | Desk | P1 |
| Web / PWA | Desk Connect-web | P1 |
| Chrome EIP-681 | Internetmoney681-Chrome | P2 |
| WalletConnect | Desk → dapps | P2 |
| iOS (Apple) | Tip/Desk companion | P3 |
| ChromeOS | Desk web | P3 |
| Ledger | research only | P3 |
| F-Droid / de-Googled APK | Tip channel | P2 |

## Layer 7 — Sync / MPC / AI → `pulse-trezor-platform`

| Track | Intent |
|-------|--------|
| **SYNC** | Tip↔Desk watch-only registry, QR pair, shared tokens/RPC/bunker — **no seed bridge** |
| **MPC** | Optional Tip soft recovery (2-of-2); never wraps Trezor SE keys |
| **AI** | Explain / prepare / MCP reads; human or device signs |

## Repo map

| Repo | Layer | Role | Visibility |
|------|-------|------|------------|
| `pulse-trezor-firmware` | 1 | GPL fork / tokens / emu / PQ research | private |
| `pulse-trezor-suite` | 3 | T-RSL reference; mapping; upstream; **no redistribute** | private |
| `pulse-trezor` | 4 | Ship Desk (HWW) + master ROADMAP | private |
| [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) | 4b | Mobile soft Pulse wallet (EIP-681, PulseX) | **public** |
| `hexican-rescue` | 5 | Bunker registry | private |
| `pulse-trezor-guides` | 6 | Docs / funnel (Tip + Desk + Graphene) | private |
| `pulse-trezor-platform` | 7 | Sync · OS matrix · MPC · AI | private |

---

## Dependency order (honest E2E)

```
Tip (mobile soft) ── already ships Pulse phone UX ── TIP1 align
                         │
FW already signs Pulse ──┐
                         ├──► Desk A0–A2 ──► HWW users leave MetaMask
Suite S1 map (parallel) ─┘         │
                                   ▼
                         Desk B + C + Rescue
                                   │
                    Suite S2 upstream (slow win)
                                   │
                         FW2 tokens / FW3 emu · TIP2 Trezor-on-Tip
                                   │
                              FW5 PQ (later)
```

**Critical path for “feels like Suite for Pulse” (HWW):** Desk A → B → C.  
**Critical path for mobile soft (already):** Tip — maintain/align, don’t rebuild.  
**Critical path for “we own the full stack”:** Firmware + Suite study + Desk + Tip, in parallel.  
**Critical path for “official Suite has Pulse”:** S2 only (out of our hands).  
**Later: Tip + Trezor on phone** = TIP2 after Desk proves Connect UX.

---

## Definition of program “E2E done”

1. **User path:** Trezor → Desk → PLS/tokens/send/swap/HEX/bunker — no MetaMask.  
2. **Firmware path:** Private FW repo builds; Pulse tokens clearer on device; emu CI green.  
3. **Suite path:** Gap fully mapped; upstream ask filed; Desk covers parity meanwhile.  
4. **Safety path:** Rescue deployed + register UI.  
5. **Docs path:** Guides published for the above.

Quantum hardware signatures are **stretch**, not required for (1)–(4).
