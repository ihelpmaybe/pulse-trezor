# Pulse Hive — PulseChain always-on backlog

**Scope: anything PulseChain needs** — but **prefer wrap / guide / custody glue over rebuilding** what other HEX/Pulse builders already ship.

**What this is:** hive mind queue. Spare Cursor / AI tokens → claim an **H#** → ship a slice → stop.

**What this is not:** a new DEX · lending protocol · analytics dashboard · second soft Android wallet · fake “official Suite” · AI custody.

**Follow + adopt map:** section **0** below (builders + already-shipped table).

| Queue | When |
|-------|------|
| **[PRIORITY.md](./PRIORITY.md)** | Gate-critical **Tip↔Desk/Trezor** path only — take if you can own the next `#` |
| **This hive (H#)** | **Everything else on Pulse** · spare tokens · parallel agents · end-of-month burn |

Custody features still prefer core loop **PulseChain · HEX · PulseX · ProveX**. Ecosystem H#s may own other Pulse repos (hearts-archive, HEX-watch, PulseTEXT, 681, mhex, vault notes, new thin repos). Wrap OSS first ([OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md)).

---

## How to claim

```
1. Open PULSE-HIVE.md
2. Lowest unchecked H# you can own (skip if claimed this session)
3. Announce: Taking HIVE H# …
4. Repo / path column → smallest shippable slice
5. Tick [x] here (+ owning TODO if any); one-line evidence
6. STOP
```

**Spare / end-of-month:** any free H# — prefer **SPARE** or whatever unlocks the most Pulse users.  
**Parallel:** different H#s only.  
**Never empty:** run **SPARE generator** at bottom; append H#s ≥ next free number.

Legend: `[ ]` open · `[~]` partial · `[x]` done

---

## 0 — Follow builders · adopt · fill gaps (don’t redo)

### Follow on X (community)
**Official:** @PulsechainCom · @HEXcrypto · @PulseXcom · @ProveXCom · @RichardHeartWin  

**Builders (ship product):** @sinofrebellion · @piteasio · @9mm_pro · @joltdotbuild · @StarfireDV · @phiatcrypto · @liquidloansio · @POWERCITYio · @IMPLSfinance · OpenPulsechain / Peplord (PulseTickers)  

**Listen:** t.me/PulseDEV · t.me/HEXcryptoDev  

### Already shipped — do NOT rebuild
| They ship | We do |
|-----------|--------|
| Piteas / 9mm / JOLT / Starfire routing | PulseX-first in Desk/Tip; deep-link others |
| Phiat / Liquid Loans / POWERCITY / IMPLS credit+vaults | Guides + WC clear-sign — no CDP product |
| OpenPulsechain safety/MCP/whales | Call MCP/API — no parallel scanner |
| Sino PulseBasis / Bag Builder | Link from HEX companion |
| PulseTickers / Peplord intel | Link — no GoPulse clone |

### Gap H#s (our wedge + glue)

| H# | Task | Owner | Notes |
|----|------|-------|-------|
| H140 | [ ] Desk deep-link / “open in” map to PulseX · ProveX · Phiat · Liquid Loans | Desk + guides | WC later |
| H141 | [ ] Guide: use PulseBasis cost-basis + Desk HWW receive | guides | don’t clone Sino |
| H142 | [ ] Guide: Bag Builder rotates → execute on Tip/Desk (PulseX) | guides | |
| H143 | [ ] Wire OpenPulsechain free MCP into agent ops (no new scanner) | platform | adopt |
| H144 | [ ] “Pulse DeFi map” one-pager: who owns what (table above) | guides | anti-redo |
| H145 | [ ] Piteas/9mm embed or deep-link notes — after PulseX Desk B | Desk BONUS | wrap |
| H146 | [ ] ProveX + bridged USDC warnings in Tip/Desk face copy | Tip/Desk | gap |
| H147 | [ ] Follow-list hygiene: quarterly re-verify handles/domains | this file | H200+ |
| H148 | [x] Seamless kit: one deep-link JSON (HEX/PulseX/ProveX/Phiat/LL/Sino/OPC) | platform | packs/pulse-core/v1/deeplinks.json |
| H149 | [x] Desk “Open app” rail from deep-link kit (no iframe rebuild) | Desk | Open on Pulse grid |
| H150 | [ ] Tip same kit after source unblocked | Tip | seamless |
| H151 | [ ] Re-score DefiLlama Pulse top-25 quality quarterly → hive | this file | H200+ |
| H152 | [ ] Wire OpenPulsechain free MCP + PulseScan history into one agent path | platform | seamless data |
| H153 | [x] Parse hexikani/pulsechain-projects → expand GH/GL builder map | vault | 199 YAML · 15 GH |
| H154 | [x] Compare DavidFeder MCP vs OpenPulsechain MCP vs ours → wrap order | vault | ours→OPC safety; no Feder wallets |
| H155 | [ ] Guides: link GitLab self-host mirrors (hex-server, pulsex-server, bridge) | guides | official |

---

## 1 — Chain & infra

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H1 | [ ] Public RPC endpoint catalog + health script (read-only) | platform / guides | pack PR |
| H2 | [ ] Document Lite-RPC / self-host path (no paid infra day-one) | guides + vault | see memory lite-rpc |
| H3 | [ ] PulseScan API route map for history/adapters | Desk / platform | SYNC7 |
| H4 | [ ] Bridge (ETH↔Pulse) user journey audit → gaps list | guides | |
| H5 | [ ] Testnet 943 faucet + faucet UX notes | guides | |
| H6 | [ ] Gas / fee market explainer for normies | guides | |
| H7 | [ ] Chainlist / wallet-add Pulse snippet pack | guides | |
| H8 | [ ] Archive vs tip RPC: when apps need which | platform | |

---

## 2 — Custody & wallets (all kinds)

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H20 | [ ] Desk: Bridge first-run detect | `pulse-trezor` | |
| H21 | [ ] Desk: PLS + ERC-20 history via PulseScan | `pulse-trezor` | |
| H22 | [ ] Desk: multi-account / passphrase UX | `pulse-trezor` | |
| H23 | [ ] WC “Open in Pulse Perch” | wallet + platform | |
| H24 | [ ] Tip: locate Android source → unblock TIP1 | `Tip-wallet` | |
| H25 | [ ] Tip: SYNC4 pack + Graphene checksums | Tip + guides | |
| H26 | [ ] Tip↔Desk watch-only SYNC | platform + both | |
| H27 | [ ] EIP-681 Chrome funnel → Tip/Desk | `Internetmoney681-Chrome` | |
| H28 | [ ] EIP-681 Android align with Tip | `Internetmoney681-Android` | |
| H29 | [ ] Suite gap map + upstream pack (no redistribute) | `pulse-trezor-suite` | |
| H30 | [ ] Firmware token defs HEX/PLSX clearer sign | `pulse-trezor-firmware` | |
| H31 | [ ] hexican-rescue forge + register UX | `hexican-rescue` | |
| H32 | [ ] Ledger-on-Pulse go/no-go one-pager | platform | research only |
| H33 | [ ] Safe/multisig on Pulse notes | platform | |
| H34 | [ ] “Add Pulse to any wallet” checklist (MM, Rabby, Frame…) | guides | docs only |

---

## 3 — HEX

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H40 | [ ] Desk HEX companion: stakes read | `pulse-trezor` | |
| H41 | [ ] Desk HEX: end/good-accounting clear-sign | `pulse-trezor` | |
| H42 | [ ] HEX-watch → shared read model / deep link | `HEX-watch` | |
| H43 | [ ] SellHEX Pulse path one-pager | `SellHEX` / guides | |
| H44 | [ ] HEX bag-builder / swap-call patterns filed as play | vault / Desk | |
| H45 | [ ] Snapshot / claim tooling honesty notes (no theater) | vault / guides | |
| H46 | [ ] HEX stake “what to click” normie guide on Pulse | guides | |
| H47 | [ ] INC / PLSX relationship explainer | guides | |

---

## 4 — PulseX & DeFi

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H50 | [ ] Desk: PulseX quote → Trezor sign | `pulse-trezor` | first-class |
| H51 | [ ] Tip: PulseX swap regression checklist | Tip | |
| H52 | [ ] PulseX router/ABI pack in platform | platform | |
| H53 | [ ] LP add/remove clear-sign checklist | Desk / guides | |
| H54 | [ ] Liquid Loans path notes → their app (no rebuild) | guides | @liquidloansio |
| H55 | [ ] Phiat path notes → their app (no rebuild) | guides | @phiatcrypto |
| H56 | [ ] Token safety via OpenPulsechain MCP — wire, don’t rebuild | platform | adopt |
| H57 | [ ] Alt DEX deep-link notes (Piteas/9mm/JOLT) — after PulseX | Desk BONUS | wrap |
| H58 | [ ] Farming / bribes UX honesty (point at IMPLS/POWERCITY; no farm product) | guides | |

---

## 5 — ProveX & money-in

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H60 | [ ] ProveX deep link from Desk + Tip | Desk/Tip + guides | core |
| H61 | [ ] Bridged USDC vs inherited USDC warnings everywhere | packs + UI | |
| H62 | [ ] ProveX escrow clear-sign checklist | Desk | |
| H63 | [ ] CEX → Pulse withdraw snippets (top exchanges) | guides | |
| H64 | [ ] Fiat on-ramp comparison: ProveX vs others (keep ProveX first) | guides | |
| H65 | [ ] Stablecoin inventory on Pulse (what’s real) | guides / pack | |

---

## 6 — Creators, pay, media

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H70 | [ ] Creator tip kit (QR + EIP-681 templates) | guides + Tip | |
| H71 | [ ] PulseTEXT tip path harden (369) | PulseTEXT-front/back | |
| H72 | [ ] Just-The-Tip Pulse 0-fee path doc/fix | `Just-The-Tip` | |
| H73 | [ ] Hearts Archive: publish + tip on Pulse polish | `hearts-archive` | |
| H74 | [ ] Hearts Archive ↔ Desk Trezor sign path | hearts-archive | |
| H75 | [ ] Free Super Chat / stream tip Pulse notes | `Free-Super-chat` | |
| H76 | [ ] “Pay on Pulse” merchant one-pager | guides | |
| H77 | [ ] X/Discord bot: tip or verify Pulse tx (read-only) | new thin / platform | |

---

## 7 — Data, analytics, indexing

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H80 | [ ] Shared HistoryProvider (PulseScan) for Desk+Tip | platform + Desk | |
| H81 | [ ] Token list governance: how to add PRC-20 safely | platform | |
| H82 | [ ] Top pairs / TVL — DefiLlama or OpenPulsechain wrap (no new dashboard) | platform | |
| H83 | [ ] Smart-money feed — OpenPulsechain MCP if free tier enough | platform | don’t rebuild |
| H84 | [ ] Portfolio snapshot export (CSV/JSON) for tax-ish | Desk / Tip | |
| H85 | [ ] Address activity “what is this contract?” explainer | AI + scan | |
| H86 | [ ] Subgraph / PulseX data freshness check script | platform | |

---

## 8 — Security, scams, pen

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H90 | [ ] Fake-Suite / phishing warning pack | guides | |
| H91 | [ ] Common Pulse scam patterns list (clipboard, approvals) | guides | |
| H92 | [ ] Desk pen report filled | `pulse-trezor` | Gate T |
| H93 | [ ] Tip pen: seed/clipboard/sideload | Tip | |
| H94 | [ ] Approval hygiene guide (revoke) | guides + Desk | |
| H95 | [ ] “Verify contract on PulseScan” checklist | guides | |
| H96 | [ ] AI refuse-set: seed/sign/custody eval cases | platform | |
| H97 | [ ] Supply-chain: pin Connect / Dependabot one repo | any code repo | |

---

## 9 — Dev tooling & OSS

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H100 | [ ] Foundry/Hardhat Pulse 369 template repo | new thin / platform | |
| H101 | [ ] viem/wagmi Pulse chain snippets | platform | |
| H102 | [ ] “Hello PLS” contract deploy tutorial | guides | |
| H103 | [ ] OpenPulsechain / cloneable patterns index | vault + guides | |
| H104 | [ ] Contribute Pulse tokens to ethereum-lists / Trezor defs | firmware upstream | |
| H105 | [ ] MCP Pulse tools: gap list vs what builders need | platform | |
| H106 | [ ] Local anvil/fork Pulse testing notes | platform | |

---

## 10 — Education, status, growth

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H110 | [ ] “What works on Pulse today” status page | guides | |
| H111 | [ ] Trezor-on-Pulse landing (Suite gap → Desk) | guides | |
| H112 | [ ] Migrate-from-ETH same-addr risk guide | guides | |
| H113 | [ ] Normie “first PLS receive” path (Tip or Desk) | guides | |
| H114 | [ ] Non-EN locale plan (one language spike) | Tip/Desk/guides | |
| H115 | [x] “Works on Pulse” badge + deep-link kit | platform + guides | works-on-pulse.json + guide |
| H116 | [ ] Glossary: PLS / HEX / PLSX / INC / ProveX / Bridge | guides | |
| H117 | [ ] Weekly hive SPARE generator run (log below) | this file | |

---

## 11 — Tokens, brands, experiments (careful)

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H120 | [ ] mHEX / Bow Pulse listing + clear-sign notes | `mhex` / HEX | |
| H121 | [ ] Unused brand ticker research → kill or file play | vault | money |
| H122 | [ ] Fair-launch / no-tax token template (if wanted) | new / vault | only if owner asks |
| H123 | [ ] Bridge-asset red-flag list (inherited vs bridged) | packs | |

---

## 12 — AI assist (never custody)

| H# | Task | Owner / repo | Notes |
|----|------|--------------|-------|
| H130 | [ ] Desk Ask: explain tx before sign | Desk | |
| H131 | [ ] Prepare unsigned tx → human/Trezor only | Desk | |
| H132 | [ ] Tip: explain EIP-681 before pay | Tip | |
| H133 | [ ] Cursor skill: Pulse Hive ops | platform / vault | |
| H134 | [ ] Local-first explain option (no seed in prompts) | platform | |

---

## SPARE — end-of-month sink (always claimable)

| H# | Task | Owner | Notes |
|----|------|-------|-------|
| H200 | [ ] Run SPARE generator → add ≥5 new H#s | this file | meta |
| H201 | [ ] Scrub one README to plain English | any | |
| H202 | [ ] Turn one Discord/X Pulse pain into an H# | this file | |
| H203 | [ ] Link-check one guides folder | guides | |
| H204 | [ ] Fill one manual smoke row with date | Desk/Tip | |
| H205 | [ ] Document one HELPFUL-NOTES gotcha as H# | this file | |
| H206 | [ ] Compare two Pulse tools → keep/kill note | guides | |
| H207 | [ ] Add one free OSS wrap candidate to OPEN-SOURCE-INFRA | pulse-trezor | |
| H208 | [ ] Price/TVL widget from free public API | Desk/guides | |
| H209 | [ ] Scam screenshot → warning blurb | guides | |
| H210 | [x] Repo hygiene: mark DONE checkboxes that are done | any TODO | 2026-11-22 |
| H211 | [ ] Write “why Pulse for X” 5-line pitch | guides | |
| H212 | [ ] Testnet dust send evidence for Desk | Desk | device |
| H213 | [ ] Catalog dead Pulse links / redirects | guides | |
| H214 | [ ] Mini threat model bullet for one product | platform | |

---

## Never (hive −∞)

- Fake official Trezor Suite · Suite redistribute  
- Second soft Android wallet (keep Tip)  
- MetaMask/Rabby as products we ship  
- **Rebuild Piteas/9mm/JOLT/Starfire DEX · Phiat/LiquidLoans CDP · OpenPulsechain scanner · PulseBasis**  
- Seed in SYNC / AI holds keys / AI signs alone  
- Paid hosted infra as day-one requirement  
- Replan the whole E2E instead of shipping an H#  
- Points farms before product  

---

## SPARE generator (keep hive full)

If unchecked SPARE &lt; 5 **or** monthly token burn night: append new H#s (next free ≥ H220) from:

1. User pain — then ask “does a followed builder already ship this?”  
2. If yes → guide / deep-link / WC / clear-sign H# (don’t rebuild)  
3. If no → custody / Tip / Desk / SYNC / ProveX glue / docs  
4. Broken infra (RPC, explorer) — prefer public API wrap  
5. HEX / PulseX / ProveX gap that **nobody** owns  
6. Creator/pay gap  
7. Security education (point at OpenPulsechain scores)  
8. Sibling repo Pulse path  
9. Dev onboarding  
10. Follow-list / domain hygiene  

Log under **Current hive focus**.

---

## Current hive focus

**Adopt first.** Follow list in §0 · gaps = HWW + Tip + SYNC + ProveX glue + guides to peers.  
Spare tokens → **H140+** or lowest free H# that isn’t a redo.  
Say: `Taking HIVE H140 …`
