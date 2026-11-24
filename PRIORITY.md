# Global build priority (AI queue)

**Single ordered list.** Agents: take the **first unchecked** row you can own → open that **repo** → do that **TODO id** → tick both here and the repo TODO → stop.

Rules: [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md) · [CORE-APPS.md](./CORE-APPS.md) (PulseChain·HEX·PulseX·ProveX) · OSS: [OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md) · Tests: [TESTING.md](./TESTING.md)

**Before coding:** wrap OSS (OPEN-SOURCE-INFRA); feature must serve a **core app**.

## Law — desktop first (operator 2026-11-24)
**Finish `pulse-trezor` (Perch desk) before Tip / mobile / new companion apps.**  
One finished desktop product teaches what Tip’s QR+SKU face should carry. Do **not** spin up 2–3 mobile apps and bounce back to desk. Tip stays QR+SKU only until Desk Gate ship is real.

Legend: **Solo** = one agent · **Parallel OK** = different rows same band only if no file conflict

---

## NOW — P0 (Gate 1 foundation) — do in order

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 1 | ~~SYNC0 address/BIP44 story spec~~ **DONE** | `pulse-trezor-platform` | [SYNC0-address-story.md](https://github.com/ihelpmaybe/pulse-trezor-platform/blob/main/SYNC0-address-story.md) | — |
| 2 | ~~SYNC4 stub token+RPC pack~~ **DONE** | `pulse-trezor-platform` | [packs/pulse-core](https://github.com/ihelpmaybe/pulse-trezor-platform/tree/main/packs/pulse-core) | — |
| 3 | ~~Desk A0 shell + Connect warm + Bridge detect~~ **DONE** | `pulse-trezor` | A0 | Vite + Connect warm + Bridge probe + SYNC0 path |
| 4 | ~~Desk A0 smoke CI scaffold (Gate T start)~~ **DONE** | `pulse-trezor` | TEST smoke | workflow + path/error unit smoke |
| 5 | ~~Desk A1 receive + PLS balance + send (testnet) + fees~~ **DONE** | `pulse-trezor` | A1 | 943 default · fee preview · Trezor sign |
| 6 | ~~Indexer decision note (scan API vs self-host)~~ **DONE** | `pulse-trezor-platform` | SYNC7 | public PulseScan; self-host deferred |
| 7 | ~~TIP0 locate Tip source / face-vs-code decision~~ **DONE** (interim) | `Tip-wallet` | TIP0 | face-only; code path unknown |
| 8 | TIP1 Tip = QR + exact divisibility→SKUs (not full wallet; pack align only if it serves that) | `Tip-wallet` | TIP1 | After #2+#7 · see Tip NOTES |
| 9 | ~~Desk A2 tokens HEX/PLSX + approve (use SYNC4)~~ **DONE** | `pulse-trezor` | A2 | balances · ERC-20 send · approve |
| 10 | ~~Guides: Suite/Connect + Desk receive thin~~ **DONE** | `pulse-trezor-guides` | G1/G5 | suite-connect · pls-on-trezor · desk-install |
| 11 | ~~Gate T: Desk smoke green + pen draft~~ **DONE** (pen Suite-quit 2026-11-23) | `pulse-trezor` | TEST | — |

**Stop claiming Gate 1 until #5+#9+#11 done.**

---

## NEXT — P1 (mobile↔desktop + thin stack)

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 12 | ~~SYNC1 registry import/export schema~~ **DONE** (Desk aligned; Tip TIP3 next) | `pulse-trezor-platform` | SYNC1 | — |
| 13 | ~~Desk A3 watch-only + registry import~~ **DONE** (SYNC1 export/import) | `pulse-trezor` | A3 | — |
| 14 | Tip SYNC import/export + QR pair | `Tip-wallet` | TIP3 | **Blocked TIP0** (no app tree) |
| 15 | ~~SYNC2 QR/deep-link pair~~ **DONE** (Desk Pair QR; Tip later) | `pulse-trezor-platform` | SYNC2 | — |
| 16 | Graphene Tip install guide + checksum notes | `pulse-trezor-guides` + Tip | G1/TIP4 | Parallel OK |
| 17 | ~~“Trezor on Pulse” landing (Suite gap → Desk)~~ **DONE** | `pulse-trezor-guides` | G6 | — |
| 18 | ~~FW0 mirror + build notes~~ **DONE** | `pulse-trezor-firmware` | FW0 | — |
| 19 | ~~FW1 Pulse 369 audit~~ **DONE** | `pulse-trezor-firmware` | FW1 | — |
| 20 | ~~Suite SU0–SU2 gap map + backend notes~~ **DONE** (public fill 2026-11-23; SU3 lab optional) | `pulse-trezor-suite` | SU0–SU2 | — |
| 21 | ~~Rescue R0 copy contract + forge CI~~ **DONE** 2026-11-23 | `hexican-rescue` | R0 | — |
| 22 | Desk Lin + Mac + Web targets | `pulse-trezor` | PLAT | After Gate 1 |
| 23 | Tip+Desk Gate T SYNC smoke | platform + both | TEST | Blocks Gate 2 |

---

## THEN — P2 (depth users feel)

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 24 | ~~Desk C HEX companion thin~~ **DONE** (modular stakes; possession nudge) | `pulse-trezor` | C | — |
| 25 | ~~Desk B **PulseX** swap (quote → Trezor sign)~~ **DONE** | `pulse-trezor` | B | face Swap tab |
| 25b | ~~ProveX deep link / USDC flow (guide + Desk entry)~~ **DONE** (guide; Desk Apps already) | guides + Desk | G6/ProveX | — |
| 26 | ~~PLAT-WC WalletConnect → Desk~~ **DONE v0** (EIP-712 still open) | `pulse-trezor` | PLAT-WC | After A1 |
| 27 | Rescue R1 deploy + R2 thin UI | `hexican-rescue` | R1–R2 | After R0 |
| 28 | SYNC3 bunker deeplink | `pulse-trezor-platform` | SYNC3 | After R1 |
| 29 | ~~EIP-712 / Permit / bulk revoke~~ **DONE** (WC strips + Approvals bulk; deepen later) | `pulse-trezor` | A2 extras | — |
| 30 | FW2 token pack + FW3 emu e2e | `pulse-trezor-firmware` | FW2–FW3 | After FW1 |
| 31 | Suite SU4 upstream ask | `pulse-trezor-suite` | SU4 | After SU2 |
| 32 | ~~AI0–AI1 explain/prepare (Desk)~~ **DONE** | platform + Desk | AI0–AI1 | TxExplain + policy tiles |
| 33 | ~~Growth: Works-on-Pulse badge~~ **DONE** · tip kit later | platform + guides | GR0/G6 | — |
| 34 | PLAT-Ext wire Internetmoney681 | `pulse-trezor-platform` | PLAT-Ext | Parallel OK |
| 35 | ~~Guides status + migrate-ETH~~ **DONE** | `pulse-trezor-guides` | G6 | — |

---

## LATER — P3 (power / multi-OS polish)

| # | Task | Repo | TODO id |
|---|------|------|---------|
| 36 | ~~Desk E power/migrate tools~~ **DONE** (Apps Migrate walk + Advanced) | `pulse-trezor` | E |
| 37 | MPC0–MPC2 Tip recovery spike | `pulse-trezor-platform` | MPC |
| 38 | TIP2 Trezor on Android | `Tip-wallet` | TIP2 |
| 39 | AI2–AI6 MCP/policy/skills | `pulse-trezor-platform` | AI |
| 40 | OPS0–OPS3 threat model + support | `pulse-trezor-platform` | OPS |
| 41 | Full OS matrix FULL bar | Desk + Tip | TEST full |
| 42 | Creator/CEX/fiat guide pack | `pulse-trezor-guides` | G6/BONUS |

---

## BONUS — P4 (after Gate 1–2 only)

| # | Task | Repo |
|---|------|------|
| 43 | Locales · Play polish · PWA polish | Tip / Desk |
| 44 | BON-Ledger go/no-go → maybe Desk | platform → Desk |
| 45 | BON-Safe / BON-AA research | platform |
| 46 | iOS Tip | Tip |
| 47 | Suite gap refresh / upstream merge follow-up | suite |
| 48 | Extra FW tokens · FW5 PQ | firmware |
| 49 | Rescue audit writeup | hexican-rescue |
| 50 | Points/airdrop | **default NO** |

---

## Never (priority −∞)

- Suite redistribute / fake official Suite  
- Second soft Android wallet  
- MetaMask/Rabby products  
- Keystone/etc. sprawl  
- Seed in SYNC  
- AI custody  
- Replan E2E / rewrite TESTING every session  

---

## How an AI picks work

```
1. Open PRIORITY.md (this file)
2. Prefer unfinished Desk (`pulse-trezor`) rows over Tip/mobile/guides-only
3. Skip Tip TIP1+ / new Android apps until Desk finish band is closed (desktop-first law)
4. Find lowest # still unchecked that you can own under that law
5. Clone/open that Repo → AGENTS.md → TODO.md → implement that id only
6. Tick repo TODO + this PRIORITY row in the same PR
7. Stop (no “while I’m here” BONUS / no new mobile repo)
```

**Spare / end-of-month tokens / non-Trezor Pulse work / blocked here:** open **[PULSE-HIVE.md](./PULSE-HIVE.md)** and claim an **H#**. Hive = **all PulseChain**, not just Trezor.

## Suggested split (@ihelpmaybe vs @togosh)

| Band | Owner bias |
|------|------------|
| #1–6 Desk Connect path | whoever has device/emu |
| #7–8 Tip source | whoever has Tip tree on disk |
| #10, #16–17 guides | either (docs) |
| #18–21 FW/Suite/Rescue | either (parallel OK) |
| BONUS | nobody until Gate 1–2 |

---

## Current focus (update when claiming)

**Active band: finish Desk.** Tip/mobile parked.  
Desk leftovers: device RBF (parked) · mainnet Sites tx dust · signed native packs · ext smoke.  
Offline GitHub mirrors (not for public GH): `E:\vault\github` (`mirrors\private` · `mirrors\public` · `releases`).  
Say: `Taking Desk …` (not Tip).
