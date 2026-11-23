# Open-source infra — adopt / wrap / don’t reinvent

For AIs and humans. Pair with [PRIORITY.md](./PRIORITY.md) · [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md).

**Default:** adopt battle-tested OSS → thin Pulse/Trezor glue → write new code only for the gap.

---

## Already ours / vault (use first)

| Piece | Where | Use for |
|-------|--------|---------|
| Connect warm + Pulse sign | `demos/pulse-publish` (`@trezor/connect-web`, viem, wagmi) | Desk A0–A1 |
| pqq derivation / registry | `**/pqq-wallet` | SYNC1, Desk A3/C |
| Tip (Rabby Mobile lineage) | Tip product + `Tip-wallet` | Soft mobile — **don’t rebuild** |
| EIP-681 Chrome/Android | `Internetmoney681-*` | Pay links / PLAT-Ext |
| RescueRegistry + forge | vault `hexican-rescue` | R0 copy in |
| Pulse MCP | Cursor PulseChain MCP | AI reads / quotes |
| Hearts Archive patterns | `hearts-archive` / pulse-publish | Vite desk shell |

---

## Stack picks by need

### Desk shell (PRIORITY #3–5, #9)

| Need | Adopt | License / note | Avoid |
|------|-------|----------------|-------|
| App shell | **Vite + React** (as pulse-publish) | MIT ecosystem | New UI framework |
| Chain I/O | **viem** + **wagmi** (+ `pulsechain` chain) | MIT | Homegrown RPC client |
| HWW | **`@trezor/connect-web`** (pin version) | T-RSL-ish suite family — use published npm | Forking Suite UI |
| Desktop pack | **Electron** or **Tauri** later; **PWA first** | — | Custom installer OS |
| Optional reference | **Frame** ([floating/frame](https://github.com/floating/frame)) GPL — study Trezor desktop patterns | Stale releases 2025 — **reference only**, don’t bet product on it | Rewriting Frame as Desk |
| Optional reference | **Rabby extension** ([RabbyHub/Rabby](https://github.com/RabbyHub/Rabby)) — MIT-ish / Other; Tip already mobile lineage | Don’t ship second Rabby | |

**Build new:** Pulse-first UX chrome, Bridge first-run, Suite-gap messaging — not a new wallet engine.

### Tip mobile (PRIORITY #7–8, #14)

| Need | Adopt | Note |
|------|-------|------|
| Soft wallet | **Keep Tip** (Rabby Mobile fork lineage) | Align via SYNC4; no third Android wallet |
| HWW later | Trezor Connect mobile / Suite-hosted flow | TIP2 after Desk A1 |
| Alt reference | **WallETH** (GPL, Trezor USB + WC + watch-only) | Ideas only; Tip stays product |

### Tokens / RPC pack (PRIORITY #2 SYNC4)

| Need | Adopt | Note |
|------|-------|------|
| List format | **Uniswap token-lists** schema and/or **ethereum-lists/tokens** shape | MIT; Pulse-specific entries we maintain |
| Official device defs | **trezor/definitions** + ethereum-lists upstream | For FW2 — contribute Pulse tokens upstream when ready |
| RPC | Public Pulse RPC + fallback list in pack | Don’t run infra day one |

### History / indexer (PRIORITY #6 SYNC7)

| Need | Adopt | Note |
|------|-------|------|
| Explorer API | **Pulse scan / Blockscout-class** HTTP API | scan.pulsechain.com lineage |
| Self-host later | **Blockscout** OSS | Only if public API blocks Gate 1 |
| Balances | viem `getBalance` / `readContract` multicall | Enough for A1 |

**Don’t** build a custom indexer for Gate 1.

### WalletConnect / dapps (PRIORITY #26)

| Need | Adopt | Note |
|------|-------|------|
| Wallet side | **Reown WalletKit** (WalletConnect) | Peer name **Pulse Perch** (Trezor transport today) |
| Dapp side (if any) | Reown AppKit / wagmi WC connector | Guides/badge only |

### Swaps + fiat (PRIORITY #25 / #25b) — core apps

| Need | Adopt | Note |
|------|-------|------|
| DEX | **PulseX** (router/API/ABI) — wrap | First-class; not Piteas/Switch first |
| Fiat ramp | **ProveX** (app.provex.com + docs.provex.com) | Deep link / WC / clear-sign escrow — don’t rebuild ramp |
| Avoid | Building an AMM or alternate fiat protocol | |

### HEX / stakes (PRIORITY #24)

| Need | Adopt | Note |
|------|-------|------|
| Paths + sign | **pqq-wallet** + Connect | Already designed |
| Chain reads | HEX contract ABI + viem / MCP | |

### Firmware (PRIORITY #18–19, #30)

| Need | Adopt | Note |
|------|-------|------|
| Tree | **trezor/trezor-firmware** GPL | Mirror; don’t rewrite |
| Tokens | **trezor/definitions** + ethereum-lists | Upstream PR path |
| Emu | Official core emulator | Same Connect path |

### Suite track (PRIORITY #20, #31)

| Need | Adopt | Note |
|------|-------|------|
| Reference | **trezor/trezor-suite** T-RSL | Read-only / lab; **no redistribute** |
| Ship UX | Desk | |

### Rescue (PRIORITY #21, #27)

| Need | Adopt | Note |
|------|-------|------|
| Tests | **Foundry** | Already |
| UI | Thin page on Desk/Tip + Connect/Tip soft | No new dapp framework |

### MPC (PRIORITY #37 later)

| Need | Adopt | Note |
|------|-------|------|
| Spike | Survey **Lit / open threshold ECDSA kits** — pick one | Don’t invent MPC crypto |
| Kill | No Pulse broadcast in 2 weeks | |

### AI (PRIORITY #32)

| Need | Adopt | Note |
|------|-------|------|
| Chain reads | **PulseChain MCP** already | |
| Local ops | Operator desk / OpenCode skills | Prepare-only; never sign |

### Guides / growth

| Need | Adopt | Note |
|------|-------|------|
| Static docs | Plain MD or existing static site gen | No custom CMS |
| QR | `qrcode` (already in pulse-publish) | |
| 681 | Internetmoney681 repos | Wire, don’t rewrite |

### Tests (Gate T)

| Need | Adopt | Note |
|------|-------|------|
| Unit/fuzz JS | **Vitest** (pulse-publish) | |
| Contracts | **Foundry** fuzz/invariant | Rescue |
| E2E browser | Playwright later | After A1 smoke script |
| Device | Connect + official emu | dont-pretend |

---

## Decision table (short)

| PRIORITY band | Default action |
|---------------|----------------|
| #1–2 SYNC | **Write** tiny JSON/schema; format from Uniswap/ethereum-lists |
| #3–5, #9 Desk | **Wrap** connect-web + viem/wagmi from pulse-publish |
| #7–8 Tip | **Change** existing Tip — don’t new app |
| #6 Indexer | **Call** scan/Blockscout API |
| #10, #16–17 Guides | **Write** MD only |
| #18–19 FW | **Fork/mirror** trezor-firmware |
| #20 Suite | **Reference** only |
| #21 Rescue | **Move** vault forge in |
| #25 Swap | **Wrap** one DEX API |
| #26 WC | **Adopt** Reown WalletKit |
| #37 MPC | **Adopt** existing kit or skip |
| BONUS Ledger | Research vendor path — not a new wallet |

---

## Explicitly do **not** adopt as product

- Full **Trezor Suite** redistribute (T-RSL)  
- Second **Rabby**/Tip clone  
- Stale **Frame** as production Desk (reference OK)  
- Homegrown AMM / indexer / MPC crypto / TTS / design system  

---

## Agent rule

Before writing >50 lines of new infra: name the OSS row above you’re wrapping. If none fits, ask — don’t invent a platform.

**Standing Cursor rules:** `.cursor/rules/adopt-first.mdc` · `.cursor/rules/modular-first.mdc`

### Invent debt (keep thin — don’t grow)

| Area | Status | Next adopt if it grows |
|------|--------|------------------------|
| Focus trap | Tiny local helper (~25 LOC) — **keep**; not worth a dep yet | `focus-trap` / `focus-trap-react` if it grows |
| Gas speed UI | Product chrome | Stay custom (HWW copy) |
| Address book / poison | Product chrome | Stay custom |
| Clear-sign strips | Product chrome | Stay custom; decode via **viem** |
| Activity merge | Thin scan client | Stay on Blockscout/PulseScan HTTP |
| Pulsex quote | Thin router wrap | Keep wrapping PulseX — no AMM |

Default reflex when tempted to “just write it”: open this file → pick a row → wrap.
