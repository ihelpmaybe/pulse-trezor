# Global build priority (AI queue)

**Single ordered list.** Agents: take the **first unchecked** row you can own → open that **repo** → do that **TODO id** → tick both here and the repo TODO → stop.

Rules: [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md) · [CORE-APPS.md](./CORE-APPS.md) (PulseChain·HEX·PulseX·ProveX) · OSS: [OPEN-SOURCE-INFRA.md](./OPEN-SOURCE-INFRA.md) · Tests: [TESTING.md](./TESTING.md)

**Before coding:** wrap OSS (OPEN-SOURCE-INFRA); feature must serve a **core app**.

Legend: **Solo** = one agent · **Parallel OK** = different rows same band only if no file conflict

---

## NOW — P0 (Gate 1 foundation) — do in order

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 1 | ~~SYNC0 address/BIP44 story spec~~ **DONE** | `pulse-trezor-platform` | [SYNC0-address-story.md](https://github.com/ihelpmaybe/pulse-trezor-platform/blob/main/SYNC0-address-story.md) | — |
| 2 | SYNC4 stub token+RPC pack (369 + **HEX/PLSX/INC/USDC** for ProveX) | `pulse-trezor-platform` | SYNC4 | After #1 |
| 3 | Desk A0 shell + Connect warm + Bridge detect | `pulse-trezor` | A0 | After #2 started |
| 4 | Desk A0 smoke CI scaffold (Gate T start) | `pulse-trezor` | TEST smoke | Parallel w/ #3 |
| 5 | Desk A1 receive + PLS balance + send (testnet) + fees | `pulse-trezor` | A1 | After #3 |
| 6 | Indexer decision note (scan API vs self-host) | `pulse-trezor-platform` | SYNC7 | Parallel w/ #5 |
| 7 | TIP0 locate Tip source / face-vs-code decision | `Tip-wallet` | TIP0 | Parallel OK |
| 8 | TIP1 consume SYNC4 pack + RPC align | `Tip-wallet` | TIP1 | After #2+#7 |
| 9 | Desk A2 tokens HEX/PLSX + approve (use SYNC4) | `pulse-trezor` | A2 | After #5 |
| 10 | Guides: Bridge install + Desk receive thin | `pulse-trezor-guides` | G1/G5 | Parallel w/ #5–9 |
| 11 | Gate T: Desk smoke green + pen draft | `pulse-trezor` | TEST | Blocks Gate 1 claim |

**Stop claiming Gate 1 until #5+#9+#11 done.**

---

## NEXT — P1 (mobile↔desktop + thin stack)

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 12 | SYNC1 registry import/export schema | `pulse-trezor-platform` | SYNC1 | Solo first |
| 13 | Desk A3 watch-only + registry import | `pulse-trezor` | A3 | After #12 |
| 14 | Tip SYNC import/export + QR pair | `Tip-wallet` | TIP3 | After #12 |
| 15 | SYNC2 QR/deep-link pair | `pulse-trezor-platform` | SYNC2 | With #13–14 |
| 16 | Graphene Tip install guide + checksum notes | `pulse-trezor-guides` + Tip | G1/TIP4 | Parallel OK |
| 17 | “Trezor on Pulse” landing (Suite gap → Desk) | `pulse-trezor-guides` | G6 | Parallel OK |
| 18 | FW0 mirror + build notes | `pulse-trezor-firmware` | FW0 | Parallel OK |
| 19 | FW1 Pulse 369 audit | `pulse-trezor-firmware` | FW1 | After #18 |
| 20 | Suite SU0–SU2 gap map + backend notes | `pulse-trezor-suite` | SU0–SU2 | Parallel OK |
| 21 | Rescue R0 copy contract + forge CI | `hexican-rescue` | R0 | Parallel OK |
| 22 | Desk Lin + Mac + Web targets | `pulse-trezor` | PLAT | After Gate 1 |
| 23 | Tip+Desk Gate T SYNC smoke | platform + both | TEST | Blocks Gate 2 |

---

## THEN — P2 (depth users feel)

| # | Task | Repo | TODO id | Parallel |
|---|------|------|---------|----------|
| 24 | Desk C HEX companion thin | `pulse-trezor` | C | After A2 |
| 25 | Desk B **PulseX** swap (quote → Trezor sign) | `pulse-trezor` | B | After A2 |
| 25b | ProveX deep link / USDC flow (guide + Desk entry) | guides + Desk | G6/ProveX | After A2 |
| 26 | PLAT-WC WalletConnect → Desk | `pulse-trezor-platform` + Desk | PLAT-WC | After A1 |
| 27 | Rescue R1 deploy + R2 thin UI | `hexican-rescue` | R1–R2 | After R0 |
| 28 | SYNC3 bunker deeplink | `pulse-trezor-platform` | SYNC3 | After R1 |
| 29 | EIP-712 / Permit / bulk revoke | `pulse-trezor` | A2 extras | After A2 |
| 30 | FW2 token pack + FW3 emu e2e | `pulse-trezor-firmware` | FW2–FW3 | After FW1 |
| 31 | Suite SU4 upstream ask | `pulse-trezor-suite` | SU4 | After SU2 |
| 32 | AI0–AI1 explain/prepare (Desk) | platform + Desk | AI0–AI1 | After A1 |
| 33 | Growth: Works-on-Pulse badge + tip kit | platform + guides | GR0/GR3/G6 | After Gate 1 |
| 34 | PLAT-Ext wire Internetmoney681 | `pulse-trezor-platform` | PLAT-Ext | Parallel OK |
| 35 | Guides status page + migrate-ETH | `pulse-trezor-guides` | G6 | Parallel OK |

---

## LATER — P3 (power / multi-OS polish)

| # | Task | Repo | TODO id |
|---|------|------|---------|
| 36 | Desk E power/migrate tools | `pulse-trezor` | E |
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
2. Find lowest # still unchecked
3. If Parallel OK and another agent owns a conflicting row, skip to next free row
4. Clone/open that Repo → AGENTS.md → TODO.md → implement that id only
5. Tick repo TODO + this PRIORITY row in the same PR
6. Stop (no “while I’m here” BONUS)
```

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

**Active band: P0.** Next: **#2 SYNC4** token+RPC stub.  
Say: `Taking PRIORITY #2 …`
