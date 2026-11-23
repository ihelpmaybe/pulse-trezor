# TODO — pulse-trezor (Desk / HWW)

This repo only. Program-wide map: [ROADMAP.md](./ROADMAP.md) · [END-TO-END.md](./END-TO-END.md) · **[TESTING.md](./TESTING.md)** · [ACCEPTANCE.md](./ACCEPTANCE.md)

Legend: `[ ]` todo · `[x]` done

## MM gap → Perch (MetaMask replacement punch list)

What MetaMask can do that Perch still can’t (or hasn’t proven). Product law: bag / send / approve / Sites / sign without MetaMask.

1. [~] **Sites pair smoke** — Piteas + **PulseX IPFS session approved** (2026-11-22, `0x73d0…36A8`) · still need live WC **sign** (mainnet bag is 0 PLS — fund dust or message-sign path)
2. [~] **Injected provider** — EIP-1193 + Settings this-tab + MV3 shell (`extension/`); load unpacked for cross-origin lab
3. [~] **Activity / history** — PulseScan feed + poison lookalike/dust flags; denser face; deeper history later
4. [~] **Gas controls** — custom max fee / tip + Speed up / Cancel stuck (RBF)
5. [x] **Token UX** — custom import + hide zeros + favorites
6. [x] **Convenience swap** — in-face PulseX (Sites remains MM-replacement path)
7. [ ] **Ship surfaces** — extension and/or mobile (desktop web + Suite today)
8. [~] **Softer first-run** — Cancel while signing; signing cue + “other screen”; fee wild-testnet note; reconcile Suite-linked vs err (2026-11-22)
9. ~~Out of scope by design~~ Snaps, fiat buy, portfolio charts — not Pulse daily-life blockers. **EVM peers in pack:** ETH / Sepolia / Holesky + Pulse test (same BIP44); Pulse remains product center.

Already covered enough for law path: bag, send, approve, multi-account load, WC methods (tx / personal_sign / typed data / switch 369), Trezor clear-sign, Pulse RPC.

## TEST — Desk (smoke / fuzz / pen / full)

Standard: [TESTING.md](./TESTING.md). No Gate ship without evidence.

### Smoke
- [x] CI `smoke`: typecheck + build + SYNC0 path / error unit tests (no Bridge in CI)
- [x] Manual/emu: address matches device screen (export + personal_sign account)
- [x] Send PLS dust (testnet) → confirmed (`tests/smoke/SIGN-TESTNET-2026-11-22.md` · `0x8bd9…2c6e`)
- [x] personal_sign via inject bridge (`tests/smoke/SIGN-PERSONAL-INJECT-2026-11-22.md`)
- [x] EIP-712 inject smoke (`tests/smoke/SIGN-EIP712-INJECT-2026-11-22.md`)
- [ ] ERC-20 send once (blocked on 943 — no token bag/pack yet)
- [x] Disconnect → watch-only still loads (localStorage)
- [ ] Suite-down and user-cancel-on-device paths

### Fuzz
- [ ] Bad addresses / amounts / chainId / paths
- [ ] Malformed token meta + RPC error bodies
- [x] Registry JSON import fuzz (no crash; reject seed-like fields) — `npm run fuzz`
- [ ] EIP-681 / WC session fuzz when those land
- [x] Time-boxed fuzz job — `scripts/fuzz-watch.mjs` (+ extreme amounts/lookalike) in smoke
- [x] Extreme face/poison/clear-sign sim — `src/ui/extreme.sim.test.ts`

### Pen
- [x] Phishing UX: PulseChain labeled; spender clear-sign
- [x] Approve/Permit/EIP-712 review — WC + TxExplain strips
- [x] Blind calldata extra confirm — WC checkbox before Sign on Trezor
- [x] No seed/key in logs; AI prepare-only — fuzz + import guards
- [x] WC origin shown before sign
- [x] Connect version pin → `@trezor/connect-web@10.0.1` (forward path)
- [~] Pen report in `tests/pen/REPORT.md` before Gate 1 — code rows filled; Suite-down manual open

### Full bar
- [ ] Matrix: Win×Lin×Mac×Web × Safe 3/5/7/emu × receive/send/token/approve
- [ ] Main 369 + testnet 943 rows
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
- [~] **EIP-712 / typed data / Permit** clear-sign path — WC strip + Permit warn
- [x] **Custom contract call** (hex assist) for power/rescue
- [x] **Address book** (label + warn new recipient)

## A3 — Accounts
- [~] BIP44 multi-account discovery — Load Account #1…N one Suite Allow (auto-gap scan later)
- [x] Passphrase / hidden wallet callouts
- [x] Watch-only after disconnect (persisted address)
- [x] Export / import registry JSON — watch export + seed-safe import

## B — DeFi (core: PulseX · ProveX)
- [x] **PulseX** swap (quote → Trezor sign) — Swap tab V2 exact-in on face (PRODUCT-LAW)
- [x] Slippage / deadline controls
- [x] **ProveX** entry: deep link / open app + USDC balance awareness
- [~] Clear-sign ProveX escrow txs when user hits them via WC/Desk
- [ ] Other DEXes (Piteas/Switch/9mm) — BONUS only

## C — HEX companion (core app)
- [ ] Reuse pqq-wallet derivation + Connect adapter
- [ ] Portfolio view (stakes + liquid HEX on Pulse)
- [ ] Stake / end / good-accounting (exact-path sign)
- [ ] Advanced claim / migrate tools

## E — Power tools
- [x] Portfolio snapshot helpers — export bag snapshot JSON
- [ ] Migrate walks → product Advanced mode
- [ ] Connect e2e harness (fakes + device checklist)

## G — Ecosystem (desk-owned bits)
- [x] Link Suite gap / upstream status from Desk UI or about page
- [x] Cross-link Tip (mobile soft) + guides + rescue
- [ ] Consume SYNC registry / token pack from `pulse-trezor-platform`

## PLAT — Desk targets (this app)
- [ ] Windows (primary)
- [ ] Linux
- [ ] macOS (Apple)
- [~] Web / PWA (Connect-web) — desk + PWA shell live; packs later
- [x] WalletConnect host (dapps → Trezor) — `src/wc/` (tx / personal_sign / EIP-712 + clear-sign)

## AI — desk surface
- [x] Settings → Agent policy tiles (`window.__pulsePerchAi`, data-ai-* attrs)
- [x] Hard gate: `requestSign` / prepare / simulate / explain assert prefs; AGENTS.md rule
- [x] Explain / simulate pane UI (AI0–AI1) — TxExplain + WC dry-run on face

## Release
- [~] Versioned builds + update channel stub — `docs/UPDATE-CHANNEL.md`
- [ ] Signed/notarized where OS requires (Mac later)
- [ ] Smoke checklist vs [ACCEPTANCE.md](./ACCEPTANCE.md) Gate 1

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
