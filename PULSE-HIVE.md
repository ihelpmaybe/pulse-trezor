# Pulse Hive — always-on build backlog

**What this is:** the PulseChain **hive mind** queue. Anyone with spare Cursor / AI tokens (end of month or idle) opens this file and **burns tokens on real Pulse work**.

**What this is not:** a new agent runtime, a second PRIORITY, or permission to invent parallel wallets.

| Queue | When |
|-------|------|
| **[PRIORITY.md](./PRIORITY.md)** | Gate-critical Desk/Tip/SYNC path — do this first if you can own the next unchecked `#` |
| **This hive (H#)** | Spare tokens · blocked on PRIORITY · parallel agent · end-of-month burn · ecosystem stretch |

Core apps only: **PulseChain · HEX · PulseX · ProveX** ([CORE-APPS.md](./CORE-APPS.md)). Wrap OSS ([OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md)). No fake Trezor. No Suite redistribute. No second soft Android wallet.

---

## How to claim (hive protocol)

```
1. Open PULSE-HIVE.md
2. Find lowest unchecked H# you can own (skip if another agent claimed it this session)
3. Announce: Taking HIVE H# …
4. Open the Repo column → that repo TODO / notes → smallest shippable slice
5. PR: tick [x] here + owning repo TODO; one-line evidence (path / CI / manual)
6. STOP — do not vacuum adjacent H#s unless you re-claim
```

**End of month / spare tokens:** skip the guilt — pick any unchecked H# in band **SPARE** or the lowest free H# in an unlocked band. Productive burn > idle credits.

**Parallel:** different H#s only. No two agents on the same H#.

**Never empty:** if the list looks thin, run a **SPARE generator** at the bottom (add 5–10 new H#s from recipes) then claim one.

---

## Legend

`[ ]` open · `[~]` partial · `[x]` done · **Repo** = where the PR lands

---

## Band A — Desk custody (Trezor)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H1 | [ ] Desk: Bridge first-run detect + install deep link | `pulse-trezor` | A1 leftover |
| H2 | [ ] Desk: firmware outdated warning from Connect features | `pulse-trezor` | A1 leftover |
| H3 | [ ] Desk: tx status poll + basic history (PulseScan adapter) | `pulse-trezor` | SYNC7 |
| H4 | [ ] Desk: stuck-tx speed-up / cancel UI | `pulse-trezor` | fees |
| H5 | [ ] Desk: BIP44 multi-account discovery | `pulse-trezor` | A3 |
| H6 | [ ] Desk: passphrase / hidden-wallet callouts | `pulse-trezor` | A3 |
| H7 | [ ] Desk: watch-only registry export/import (SYNC1 shape) | `pulse-trezor` | after SYNC1 |
| H8 | [ ] Desk: approval inventory + bulk revoke | `pulse-trezor` | A2 leftover |
| H9 | [ ] Desk: EIP-712 / Permit clear-sign path | `pulse-trezor` | A2 |
| H10 | [ ] Desk: custom contract call assist (ABI/hex) | `pulse-trezor` | power/rescue |
| H11 | [ ] Desk: address book + warn-new-recipient | `pulse-trezor` | A2 |
| H12 | [ ] Desk: Linux AppImage / deb or documented web | `pulse-trezor` | PLAT-Lin |
| H13 | [ ] Desk: macOS build notes (Apple Silicon + Intel) | `pulse-trezor` | PLAT-Mac |
| H14 | [ ] Desk: PWA / offline shell polish | `pulse-trezor` | PLAT-Web |
| H15 | [ ] Desk Gate T: device/emu smoke rows filled | `pulse-trezor` | tests/smoke |
| H16 | [ ] Desk Gate T: pen report filled | `pulse-trezor` | tests/pen |
| H17 | [ ] Desk fuzz job time-boxed in CI | `pulse-trezor` | TESTING |
| H18 | [ ] Desk: Connect 10 upgrade spike (or pin+justify 9) | `pulse-trezor` | supply chain |

---

## Band B — DeFi face (PulseX · ProveX)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H20 | [ ] PulseX quote → Desk Trezor sign (happy path) | `pulse-trezor` | B |
| H21 | [ ] PulseX slippage / deadline / deadline UX | `pulse-trezor` | B |
| H22 | [ ] ProveX deep link + bridged-USDC balance awareness | `pulse-trezor` + guides | core |
| H23 | [ ] ProveX escrow clear-sign checklist on Desk | `pulse-trezor` | when WC/Desk hits it |
| H24 | [ ] Guides: CEX → Pulse → Tip/Desk withdraw snippets (top 3) | `pulse-trezor-guides` | last mile |
| H25 | [ ] BONUS only: Piteas/Switch/9mm wrap notes (not first-class) | `pulse-trezor` | after Gate |

---

## Band C — HEX

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H30 | [ ] Desk HEX companion: stakes list (read) | `pulse-trezor` | C |
| H31 | [ ] Desk HEX: end-stake / good-accounting clear-sign | `pulse-trezor` | C |
| H32 | [ ] Reuse pqq-wallet derivation notes in Desk C | `pulse-trezor` | vault |
| H33 | [ ] HEX-watch → Desk deep-link or shared read model | `HEX-watch` / Desk | adopt |
| H34 | [ ] SellHEX / stake tools: Pulse path one-pager | guides | money |

---

## Band D — Tip (soft mobile)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H40 | [ ] Unblock TIP0: operator names Tip Android source path | `Tip-wallet` | blocked |
| H41 | [ ] TIP1: Tip consumes SYNC4 rpc+tokenlist | `Tip-wallet` | after H40 |
| H42 | [ ] Tip backup-verify (seed quiz) flow | `Tip-wallet` | pen |
| H43 | [ ] Tip Graphene sideload + APK checksum publish | `Tip-wallet` + guides | |
| H44 | [ ] Tip Obtainium / F-Droid install notes | guides | |
| H45 | [ ] Tip EIP-681 fuzz cases in CI (when source live) | `Tip-wallet` | |
| H46 | [ ] Tip↔Desk SYNC import (watch-only) | Tip + Desk | after SYNC1 |
| H47 | [ ] TIP2 spike: Trezor Connect on Android (after Desk solid) | `Tip-wallet` | |

---

## Band E — SYNC / platform / OS

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H50 | [ ] SYNC1 registry JSON schema + seed-reject fuzz | `pulse-trezor-platform` | |
| H51 | [ ] SYNC2 QR / deep-link pair Tip↔Desk | platform | |
| H52 | [ ] SYNC3 bunker register deeplink | platform + rescue | |
| H53 | [ ] Implement Desk HistoryProvider vs PulseScan | `pulse-trezor` | SYNC7 |
| H54 | [ ] Vendor indexer.json into Desk pack | `pulse-trezor` | |
| H55 | [ ] PLAT-WC WalletConnect → Pulse Desk | platform + Desk | |
| H56 | [ ] Wire Internetmoney681-Chrome into funnel | platform | |
| H57 | [ ] Align Internetmoney681-Android with Tip pay links | platform | |
| H58 | [ ] OPS0 one-page threat model (Tip vs Trezor vs MPC vs AI) | platform | |
| H59 | [ ] OPS3 status page “what works today” | guides + platform | |
| H60 | [ ] GR0 “Works on Pulse” badge + deep-link kit | platform + guides | |

---

## Band F — Rescue / Suite / firmware

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H70 | [ ] hexican-rescue: forge test green + deploy smoke | `hexican-rescue` | |
| H71 | [ ] Rescue register/rebind UI notes or thin page | rescue / Desk E | |
| H72 | [ ] Suite SU1: map Pulse absence in coins-eth / Networks | `pulse-trezor-suite` | T-RSL |
| H73 | [ ] Suite SU2: Blockbook-class backend notes for 369 | suite | no redistribute |
| H74 | [ ] Suite SU4: upstream issue/PR pack draft | suite | |
| H75 | [ ] FW0: firmware mirror + build docs | `pulse-trezor-firmware` | GPL |
| H76 | [ ] FW1: Pulse 369 + model matrix audit | firmware | |
| H77 | [ ] FW2: HEX/PLSX token defs for clearer sign | firmware | |
| H78 | [ ] FW3: emu e2e Connect → sign PLS + ERC-20 | firmware | |

---

## Band G — Guides / adoption / growth

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H80 | [ ] “Trezor on Pulse” landing (Suite gap → Desk) | `pulse-trezor-guides` | ADOPTION P0 |
| H81 | [ ] Bridge → Desk receive guided flow | guides + Desk | |
| H82 | [ ] Passphrase / hidden wallet normie guide | guides | |
| H83 | [ ] Migrate-from-ETH checklist (same-addr risk) | guides | |
| H84 | [ ] Creator tip kit (QR + EIP-681 examples) | guides + Tip | |
| H85 | [ ] Honest bunker / quantum-prep narrative (no fake PQ) | guides + rescue | |
| H86 | [ ] Link-check CI for guides | guides | |
| H87 | [ ] Locales plan (after EN) — one-pager | Tip/Desk/guides | |

---

## Band H — AI / hive infra (keys stay offline)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H90 | [ ] AI0 Desk “Ask” pane: explain tx plain English | Desk + platform | never sign |
| H91 | [ ] AI1 prepare unsigned tx → Trezor confirm only | Desk | |
| H92 | [ ] AI2 MCP read tools: balances / stakes / bunker | platform | |
| H93 | [ ] AI3 Tip: explain EIP-681 / QR before pay | Tip | after source |
| H94 | [ ] AI5 Cursor skill: “Pulse hive / Desk ops” | platform / vault | |
| H95 | [ ] Hive: monthly SPARE generator run logged | this file | see bottom |
| H96 | [ ] Hive: CONTRIBUTORS spare-token playbook one-pager | this repo | togosh OK |

---

## Band I — Ecosystem products (existing repos)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H100 | [ ] Hearts Archive: Pulse Desk pay/tip path notes | `hearts-archive` | |
| H101 | [ ] Hearts Archive: Trezor sign path smoke (reuse Desk) | hearts-archive | |
| H102 | [ ] PulseTEXT: tip UI ↔ PulseChain 369 harden | PulseTEXT-* | |
| H103 | [ ] Just-The-Tip: PulseChain fee-0 path doc or fix | `Just-The-Tip` | |
| H104 | [ ] mHEX / Bow: Pulse listing + Desk clear-sign notes | `mhex` / HEX | |
| H105 | [ ] Lite-RPC / self-host notes → hive link from vault | platform / guides | no infra day-one |
| H106 | [ ] Public Pulse RPC health monitor script (read-only) | platform | |

---

## Band J — MPC / research (spike, don’t invent)

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H110 | [ ] MPC0 survey → pick 1 kit | platform | |
| H111 | [ ] MPC1 Tip recovery threat model | platform | |
| H112 | [ ] MPC2 2-of-2 spike → broadcast on 369 | platform | kill if >2wk |
| H113 | [ ] BON-Ledger Pulse path go/no-go one-pager | platform | |
| H114 | [ ] BON-Safe multisig on Pulse notes | platform | |
| H115 | [ ] BON-AA landscape spike doc only | platform | |

---

## Band SPARE — end-of-month token sink (never refuse work)

Pick any unchecked below when PRIORITY is blocked or credits are burning.

| H# | Task | Repo | Notes |
|----|------|------|-------|
| H200 | [ ] Add 5 new H#s from SPARE generator (then claim one) | this file | meta |
| H201 | [ ] Scrub one repo README to chat-is-the-UI plain English | any | |
| H202 | [ ] File one ADOPTION idea as a concrete H# + owner | this file | |
| H203 | [ ] Dependabot / lockfile audit on one code repo | Desk/Tip/… | |
| H204 | [ ] Screenshot + fill one tests/smoke manual row | Desk | device |
| H205 | [ ] Translate one guide section outline (non-EN) | guides | |
| H206 | [ ] Write one “why Pulse not ETH for this job” tweet-length for guides | guides | |
| H207 | [ ] Compare PulseX vs one alt DEX — kill/keep note | Desk B BONUS | |
| H208 | [ ] Catalog public Pulse RPC endpoints → pack PR | platform | |
| H209 | [ ] Pen: phishing copy pass on Desk face strings | Desk | |
| H210 | [ ] Pen: seed-in-log grep across Tip/Desk trees | Tip/Desk | |
| H211 | [ ] OpenAPI sniff PulseScan v2 → HistoryProvider stubs | Desk | |
| H212 | [ ] Document Connect gesture rules for next AI | Desk AGENTS | |
| H213 | [ ] Tag 10 ROADMAP checkboxes that are already DONE | pulse-trezor | hygiene |
| H214 | [ ] Create `memory/` or GH issue from one HELPFUL-NOTES gotcha | vault/GH | |
| H215 | [ ] Mini eval: 3 hostile prompts an AI must refuse (seed/sign) | platform AI | |
| H216 | [ ] Graphene Tip install dry-run checklist | guides | |
| H217 | [ ] WC session fuzz outline (no code yet) | Desk | |
| H218 | [ ] Fee UI: show USD-ish estimate if public price feed free | Desk | |
| H219 | [ ] ProveX docs deep-link index for Desk | guides | |

---

## Never (hive −∞)

Same as PRIORITY: Suite redistribute · second soft Android wallet · MetaMask/Rabby products · Keystone sprawl · seed in SYNC · AI custody · replan E2E every session · paid infra day-one.

---

## SPARE generator (keep the hive full)

When unchecked SPARE rows &lt; 5, append **new H#s** (next free number ≥ H220) using these recipes — one PR per generator run:

1. **Core-app gap** — something HEX / PulseX / ProveX users still can’t do on Desk or Tip  
2. **Custody friction** — Bridge, fees, clear-sign, passphrase, migrate  
3. **Adoption lever** — from [ADOPTION.md](./ADOPTION.md) not yet an H#  
4. **Test debt** — smoke / fuzz / pen / full row without evidence  
5. **OSS wrap** — adopt existing tool instead of inventing ([OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md))  
6. **Sibling repo** — hearts-archive / 681 / PulseTEXT / HEX-watch / mhex Pulse path  
7. **Docs** — one normie page that removes a MetaMask step  
8. **AI assist** — explain/prepare only; never keys  

Log the run under **Current hive focus**.

---

## Suggested owners

| Who | Bias |
|-----|------|
| @ihelpmaybe | PRIORITY Gate + hive claim any |
| @togosh | Hive H# or PRIORITY parallel rows; spare-token burn welcome |
| Any AI with credits | Lowest free H# you can ship tonight |

---

## Current hive focus

**Hive live.** Prefer PRIORITY #10/#11 if unblocked; else claim lowest free **H#**.  
Spare tokens: start at **Band SPARE (H200+)** or **H1**.  
Say: `Taking HIVE H1 …`
