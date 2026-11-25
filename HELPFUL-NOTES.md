# Helpful notes — Pulse Trezor program

Short operator facts. Pair with [END-TO-END.md](./END-TO-END.md) · [TESTING.md](./TESTING.md) · [ACCEPTANCE.md](./ACCEPTANCE.md).

---

## PulseChain quick facts

| | |
|--|--|
| Chain id | **369** (main) · **943** (Testnet V4) |
| Native | PLS |
| RPC (common) | `https://rpc.pulsechain.com` |
| Explorer | `https://scan.pulsechain.com` |
| Same address as ETH | Yes for BIP44 `m/44'/60'/0'/0/n` — **same key controls ETH + Pulse** if reused |

Treat “same address on ETH and Pulse” as a **risk briefing**, not a feature to hide.

---

## Custody lanes (don’t mix them up)

| Lane | Product | Keys |
|------|---------|------|
| Hardware | **Desk** (`pulse-trezor`) | Trezor SE via Connect |
| Soft mobile | **Tip** | Seed on phone |
| Official Suite | Upstream | No Pulse UI today |
| Soft recovery (later) | MPC on Tip | Never wraps Trezor keys |

**SYNC** shares **watch-only** registry / labels / bunker links — **never** seeds, xprv, or mnemonic.

---

## Derivation (Tip ↔ Trezor story)

Default MetaMask / Trezor Account style:

```text
m/44'/60'/0'/0/{index}
```

- Tip soft account 0 and Trezor “Account 1” index 0 **can** be the same address **only if** the Tip seed is that device’s seed — usually they are **different wallets**.
- Product copy must say: pairing = **watch the same addresses**, not “your Tip seed is on the Trezor.”
- Isolated stake paths (mHEX/pqq): `m/44'/60'/1'/0/{index}` — persist `derivationPath`; never assume index-only.

Existing portable layer: `@hex/pqq-wallet` patterns (mHEX / HEX trees) when that package is available locally.

---

## Trezor Connect / Bridge gotchas

- Real path only: **app → Connect → Bridge → device/emu**. No software-HD labeled “Trezor.”
- **Safe 7** often needs newer Connect + Suite-hosted flow; old popup path may fail — document version pins.
- Connect warm must stay in the **user gesture** turn for popups (see Heart’s Archive / pulse-publish `TrezorBar`).
- Firmware **already** knows Pulse (`chain_id` 369). Suite **UI** is the gap, not signing ability.
- Coin defs for Suite/Connect live in Suite monorepo `packages/connect-data/files/coins-eth.json` (not auto-synced from firmware anymore).

---

## License walls

| Tree | License | Practical |
|------|---------|-----------|
| `trezor-firmware` | GPL-3 | Fork/redistribute OK if GPL followed |
| Suite / Connect (suite monorepo) | **T-RSL** | Reference / lab; **do not** redistribute Suite |
| Desk / Tip / our code | Choose deliberately (prefer clear OSS or proprietary — decide before public) |

Desk is the **shippable** “Suite for Pulse.” Suite repo = study + upstream only.

---

## Core apps (don’t dilute)

**PulseChain · HEX · PulseX · ProveX** — see [CORE-APPS.md](./CORE-APPS.md).

## Tokens / DeFi (starter)

Confirm addresses on Pulse scan before hardcoding:

- SYNC4 pack: PLS, **HEX**, **PLSX**, INC, **USDC** (ProveX).
- Swap: **PulseX** first-class on Desk/Tip.
- Fiat: **ProveX** deep links — not a generic on-ramp shopping list.
- Approvals: spender + amount clear; revoke inventory = pen bar.

---

## Existing code to reuse (operator PC)

Don’t greenfield what already works:

| Piece | Where (vault / demos) |
|-------|------------------------|
| Connect warm + Pulse sign | `demos/pulse-publish/src/trezor/` |
| Studio Trezor bar | `demos/pulse-publish/src/TrezorBar.tsx` |
| pqq derivation + Connect adapter | `**/pqq-wallet` under HEX/mhex trees |
| Rescue registry + forge | sibling `hexican-rescue` repo when present |
| EIP-681 | `Internetmoney681-Chrome` · `Internetmoney681-Android` · Tip |
| Pulse MCP reads | Cursor PulseChain MCP (balances, swaps, etc.) |

Copy/adapt into private repos; don’t bind Desk forever to vault paths.

---

## Mobile ↔ desktop

1. Export watch-only registry → QR / file → import on the other client.  
2. Same RPC + token pack versions.  
3. Bunker deeplink after rescue deploy.  
4. Graphene: sideload Tip; document unknown-sources + APK checksum (TESTING pen).

---

## AI / agents

- Allowed: explain tx, simulate, draft unsigned payload, MCP **reads**.  
- Forbidden: hold seed, auto-sign, “AI wallet” marketing.  
- Scrub prompts: no mnemonic, xprv, raw seed screenshots.

---

## MPC (when spiked)

- Tip soft recovery only (e.g. 2-of-2).  
- Kill criterion: no Pulse broadcast within spike window.  
- Never claim MPC = quantum-safe.

---

## Quantum / bunker (honest)

- ECDSA still signs on-chain today.  
- Hexican rescue = **never-sign destination** + move liquid bag — prep, not PQ crypto.  
- PQ firmware = FW5 only when chain verifies non-ECDSA.

---

## Common failure modes

| Symptom | Likely cause |
|---------|----------------|
| Connect popup blocked | Gesture/await order; browser popup blocker |
| Safe 7 won’t talk to app | Old Connect / need Suite mobile host path |
| “Wrong network” | Wallet on ETH; need 369 |
| Suite missing Pulse | Expected — use Desk |
| Balance 0 but funds exist | Wrong chain / wrong account index / indexer lag |
| Tip update wiped wallet | User uninstalled instead of update-over — warn in UI |
| Seed in SYNC file | Reject at parse — fuzz/pen must cover |

---

## Testing reminders

- Evidence required: command + artifact ([TESTING.md](./TESTING.md)).  
- Gate T blocks Gate 1–3 ([ACCEPTANCE.md](./ACCEPTANCE.md)).  
- Emulator OK if same Connect→Bridge path; label lab FW clearly.

---

## Repo map (links)

| Repo | Notes home |
|------|------------|
| [pulse-trezor](https://github.com/ihelpmaybe/pulse-trezor) | This file + Desk |
| [Tip-wallet](https://github.com/ihelpmaybe/Tip-wallet) | Soft Android |
| [pulse-trezor-platform](https://github.com/ihelpmaybe/pulse-trezor-platform) | Sync / MPC / AI / OS |
| [pulse-trezor-firmware](https://github.com/ihelpmaybe/pulse-trezor-firmware) | GPL device |
| [pulse-trezor-suite](https://github.com/ihelpmaybe/pulse-trezor-suite) | T-RSL study |
| [hexican-rescue](https://github.com/ihelpmaybe/hexican-rescue) | Bunker |
| [pulse-trezor-guides](https://github.com/ihelpmaybe/pulse-trezor-guides) | End-user docs |

---

## Decision log (keep short)

| Decision | Choice |
|----------|--------|
| Suite redistribute | **No** (T-RSL) |
| User HWW UX | **Desk**, not Suite fork |
| Mobile soft | **Tip** (don’t rebuild in Desk) |
| Seed between Tip and Trezor | **Never sync** |
| First Desk OS | **Windows**, then Lin/Mac/Web |
| First swap | **One** venue |
| Tests | Smoke + fuzz + pen + full before ship |

## Efficiency

See [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md). Shared packs in platform; don’t replan E2E; AI loads TODO not the whole wiki.

## Contributors

- Owner: [@ihelpmaybe](https://github.com/ihelpmaybe)
- Contributor: [@togosh](https://github.com/togosh) — may point AI at any repo; start at that repo `AGENTS.md` → `TODO.md` (different rows if parallel).
