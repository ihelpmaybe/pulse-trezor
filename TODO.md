# TODO — pulse-trezor (Desk / HWW)

This repo only. Program-wide map: [ROADMAP.md](./ROADMAP.md) · [END-TO-END.md](./END-TO-END.md) · **[TESTING.md](./TESTING.md)** · [ACCEPTANCE.md](./ACCEPTANCE.md)

**Board of truth:** MM product punch list → [MM-REPLACEMENT-100.md](./MM-REPLACEMENT-100.md). This file = desk gates / smoke / ship. Don’t duplicate long status here.

Legend: `[ ]` todo · `[x]` done · `[~]` partial

## MM gap → Perch (summary — detail in MM-REPLACEMENT-100)

Product law: bag / send / approve / Sites / sign without MetaMask.

1. [~] **Sites pair smoke** — live WC personal_sign PASS · tx/swap on 369 still needs dust
2. [x] **Injected provider** — this-tab + MV3; **`0.1.4`** offscreen bridge + session cache (reload unpacked)
3. [x] **Activity / history** — dense grid + paged PulseScan + infinite scroll
4. [~] **Gas / RBF** — UI + ynatm ladder + Anvil lab **PASS** (2026-11-24); **device** stuck-tx proof OPEN
5. [x] **Token UX** — custom import + hide zeros + favorites
6. [x] **Convenience swap** — in-face PulseX
7. [~] **Ship surfaces** — MV3 sideload **`0.1.4`** + CWS-ready docs; Store listing + mobile later
8. [x] **Softer first-run** — Cancel / Suite cues / FAQ
9. ~~Out of scope by design~~ Snaps, fiat buy, portfolio charts. **EVM peers in pack** OK; Pulse remains center.

**Also landed (wraps):** valve gas tiers · SIWE gate · local ERC-7730 + upstream `registry/pulsechain/` · Temper dry-run + balance Δ · Connect 10 typed-data / TRANSPORT cues · trezor-user-env lab scripts.

Already covered enough for law path: bag, send, approve, multi-account load, WC methods (tx / personal_sign / typed data / switch 369), Trezor clear-sign, Pulse RPC.

## TEST — Desk (smoke / fuzz / pen / full)

Standard: [TESTING.md](./TESTING.md). No Gate ship without evidence.

### Smoke
- [x] CI `smoke`: typecheck + build + SYNC0 path / error unit tests (no Bridge in CI)
- [x] Manual/emu: address matches device screen (export + personal_sign account)
- [x] Send PLS dust (testnet) → confirmed (`tests/smoke/SIGN-TESTNET-2026-11-22.md` · `0x8bd9…2c6e`)
- [x] personal_sign via inject bridge (`tests/smoke/SIGN-PERSONAL-INJECT-2026-11-22.md`)
- [x] EIP-712 inject smoke (`tests/smoke/SIGN-EIP712-INJECT-2026-11-22.md`)
- [x] EIP-712 via WC wallet path (`tests/smoke/SITES-WC-EIP712-2026-11-22.md`)
- [x] ERC-20 send once (`tests/smoke/ERC20-SEND-2026-11-22.md` · WPLS self `0xb35d…07a1`)
- [x] Disconnect → watch-only still loads (localStorage)
- [x] Suite-down and user-cancel-on-device — cancel + Suite-quit PASS (`SUITE-DOWN-CANCEL-2026-11-22.md` · 2026-11-23)

### Fuzz
- [x] Bad addresses / amounts / chainId / paths — string guards in `npm run fuzz` (2026-11-23)
- [x] Malformed token meta + RPC error bodies — sanitize fuzz 2026-11-23
- [x] Registry JSON import fuzz (no crash; reject seed-like fields) — `npm run fuzz`
- [x] WC session URI fuzz (shape reject) — `npm run fuzz` 2026-11-23; deeper session object fuzz later
- [x] Time-boxed fuzz job — `scripts/fuzz-watch.mjs` (+ extreme amounts/lookalike) in smoke
- [x] Extreme face/poison/clear-sign sim — `src/ui/extreme.sim.test.ts`

### Pen
- [x] Phishing UX: PulseChain labeled; spender clear-sign
- [x] Approve/Permit/EIP-712 review — WC + TxExplain strips
- [x] Blind calldata extra confirm — WC checkbox before Sign on Trezor
- [x] No seed/key in logs; AI prepare-only — fuzz + import guards
- [x] WC origin shown before sign
- [x] Connect version pin → `@trezor/connect-web@10.0.1` (forward path)
- [x] Pen report in `tests/pen/REPORT.md` before Gate 1 — cancel + Suite-quit PASS 2026-11-23

### Full bar
- [~] Matrix: Win×Lin×Mac×Web × Safe 3/5/7/emu — template [docs/OS-DEVICE-MATRIX.md](./docs/OS-DEVICE-MATRIX.md); Win lab PASS
- [~] Main 369 + testnet 943 rows — 943 smokes PASS; 369 Sites tx OPEN
- [ ] FULL green before ACCEPTANCE Gate 1–2
- [ ] Re-run pen &lt; 30 days before each release tag

## A0 — Bootstrap
- [x] App shell (Vite + Connect patterns)
- [x] Warm Connect 10 + Suite probe; human-readable errors
- [x] Connect / disconnect; address matches device screen
- [x] Pulse RPC + explorer links (chain 369)

## A1 — Core custody
- [x] Receive + verify-on-device
- [x] PLS balance
- [x] Send PLS (prepare → Trezor sign → broadcast)
- [x] **Fee / gas UI** (estimate preview + RBF speed-up / cancel)
- [x] Tx status + basic history — face poll + PulseScan Activity
- [x] **Indexer decision** (scan API vs self-host) — platform SYNC7 (PulseScan public API)
- [x] **Testnet V4 (943)** toggle for safe e2e
- [x] **First-run: detect Suite Desktop / Suite Web** (Connect 10; not legacy Bridge :21325)
- [x] **Firmware outdated warning** (Connect device features)

## A2 — Tokens
- [x] Token list: HEX, PLSX, INC, bridged USDC (SYNC4 pack; custom add later)
- [x] Token balances
- [x] Send ERC-20
- [x] Approve / revoke UI (spender, amount / max clear)
- [x] **Approval inventory + revoke** — Scan + per-row + bulk Revoke
- [x] **EIP-712 / typed data / Permit** clear-sign path — WC strip + Permit warn + danger ack
- [x] **Custom contract call** (hex assist) for power/rescue
- [x] **Address book** (label + warn new recipient)

## A3 — Accounts
- [x] BIP44 multi-account discovery — Load N + **Discover used** (PLS gap trim + spare) 2026-11-23
- [x] Passphrase / hidden wallet callouts
- [x] Watch-only after disconnect (persisted address)
- [x] Export / import registry JSON — watch export + seed-safe import

## B — DeFi (core: PulseX · ProveX)
- [x] **PulseX** swap (quote → Trezor sign) — Swap tab V2 exact-in on face (PRODUCT-LAW)
- [x] Slippage / deadline controls
- [x] **ProveX** entry: deep link / open app + USDC balance awareness
- [x] Clear-sign ProveX / Permit(2) when user hits them via WC — host + typed-data strips 2026-11-23
- [ ] Other DEXes (Piteas/Switch/9mm) — BONUS only

## C — HEX companion (core app)
- [x] Modular HEX stakes UI — Settings → Modules (default off); possession nudge when stakes exist
- [~] Reuse pqq-wallet derivation + Connect adapter — not required for “has stakes” view
- [x] Portfolio view (stakes + liquid HEX) — Stakes tab when module on
- [~] Stake / end clear-sign via Sites — not in-desk stakeStart product
- [x] Advanced claim / migrate tools — Apps card → custom call / Approvals / Sites + migrate guide 2026-11-23

## E — Power tools
- [x] Portfolio snapshot helpers — export bag snapshot JSON
- [ ] Migrate walks → product Advanced mode
- [ ] Connect e2e harness (fakes + device checklist)

## G — Ecosystem (desk-owned bits)
- [x] Link Suite gap / upstream status from Desk UI or about page
- [x] Cross-link Tip (mobile soft) + guides + rescue
- [~] Consume SYNC registry / token pack from `pulse-trezor-platform` — SYNC1 export/import aligned 2026-11-23; pack tokens still local

## PLAT — Desk targets (this app)
- [x] Windows (primary) — lab PASS 2026-11
- [ ] Linux — OPEN (runbook in docs/OS-DEVICE-MATRIX.md)
- [ ] macOS (Apple) — OPEN
- [x] Web / PWA (Connect-web) — desk + SW shell-v3; signed native packs later
- [x] WalletConnect host (dapps → Trezor) — `src/wc/` (tx / personal_sign / EIP-712 + clear-sign)

## AI — desk surface
- [x] Settings → Agent policy tiles (`window.__pulsePerchAi`, data-ai-* attrs)
- [x] Hard gate: `requestSign` / prepare / simulate / explain assert prefs; AGENTS.md rule
- [x] Explain / simulate pane UI (AI0–AI1) — TxExplain + WC dry-run on face

## Release
- [x] Versioned builds + update channel — `docs/UPDATE-CHANNEL.md` + Gate 1 checklist
- [ ] Signed/notarized where OS requires (Mac later)
- [~] Smoke checklist vs [ACCEPTANCE.md](./ACCEPTANCE.md) Gate 1 — `docs/GATE-1-CHECKLIST.md`

## Growth (Desk surfaces) — see [ADOPTION.md](./ADOPTION.md)
- [x] First-run: Bridge → receive after Bridge guide
- [x] Migrate-from-ETH wizard entry
- [x] WC peer name **Pulse Perch** + Pulse chain
- [x] Deep link / badge target for “Open in Desk” — `?uri=` + `web+pulseperch:`
- [~] Watch-only mode pitched for Tip users (SYNC) — Tip link on Apps

## BONUS — after Gate 1–2 (do not start early)

See [ADOPTION.md](./ADOPTION.md) P1–P2 · [BUILD-EFFICIENCY.md](./BUILD-EFFICIENCY.md) other-wallets.

- [ ] Locales after English (UI strings)
- [ ] Public Desk **PWA** polish (zero-install try) — beyond bare Web
- [ ] Opt-in light metrics (first-send) — no seed telemetry
- [ ] Safe{Wallet} / multisig connect path (optional power users)
- [ ] Account-abstraction / smart-EOA spike (only if Pulse ecosystem needs it)
- [ ] Ledger signing path **only if** platform PLAT-Ledger research says yes
- [ ] Points/airdrop experiments — **default no** (owner override)

## Ship order (this repo)
1. A0 → A1 (Win, Bridge, fees, history) → A2 → SYNC hooks → A3 → Lin/Mac/Web → C → B → WC → AI → E  
2. BONUS only after Gate 1–2 green
