# TODO — pulse-trezor (Desk / HWW)

This repo only. Program-wide map: [ROADMAP.md](./ROADMAP.md) · [END-TO-END.md](./END-TO-END.md) · **[TESTING.md](./TESTING.md)** · [ACCEPTANCE.md](./ACCEPTANCE.md)

Legend: `[ ]` todo · `[x]` done

## TEST — Desk (smoke / fuzz / pen / full)

Standard: [TESTING.md](./TESTING.md). No Gate ship without evidence.

### Smoke
- [x] CI `smoke`: typecheck + build + SYNC0 path / error unit tests (no Bridge in CI)
- [ ] Manual/emu: address matches device screen
- [ ] Send PLS dust (testnet) → confirmed
- [ ] ERC-20 send once
- [ ] Disconnect → watch-only registry loads
- [ ] Bridge-down and user-cancel-on-device paths

### Fuzz
- [ ] Bad addresses / amounts / chainId / paths
- [ ] Malformed token meta + RPC error bodies
- [ ] Registry JSON import fuzz (no crash; reject seed-like fields)
- [ ] EIP-681 / WC session fuzz when those land
- [ ] Time-boxed fuzz job in CI

### Pen
- [ ] Phishing UX: PulseChain labeled; spender clear-sign
- [ ] Approve/Permit/EIP-712 review
- [ ] Blind calldata extra confirm
- [ ] No seed/key in logs; AI prepare-only
- [ ] WC origin shown before sign
- [ ] Dependabot/lockfile; Connect version pin
- [ ] Pen report in `tests/pen/REPORT.md` before Gate 1

### Full bar
- [ ] Matrix: Win×Lin×Mac×Web × Safe 3/5/7/emu × receive/send/token/approve
- [ ] Main 369 + testnet 943 rows
- [ ] FULL green before ACCEPTANCE Gate 1–2
- [ ] Re-run pen &lt; 30 days before each release tag

## A0 — Bootstrap
- [x] App shell (Vite + Connect patterns)
- [x] Warm Connect + Bridge; human-readable errors
- [x] Connect / disconnect; address matches device screen
- [x] Pulse RPC + explorer links (chain 369)

## A1 — Core custody
- [x] Receive + verify-on-device
- [x] PLS balance
- [x] Send PLS (prepare → Trezor sign → broadcast)
- [x] **Fee / gas UI** (estimate preview; bump / stuck speed-up later)
- [ ] Tx status + basic history
- [x] **Indexer decision** (scan API vs self-host) — platform SYNC7 (PulseScan public API)
- [x] **Testnet V4 (943)** toggle for safe e2e
- [ ] **First-run: detect/install Bridge**
- [ ] **Firmware outdated warning** (Connect device features)

## A2 — Tokens
- [ ] Token list: HEX, PLSX, INC, custom add-by-contract
- [ ] Token balances
- [ ] Send ERC-20
- [ ] Approve / revoke UI (spender, amount clear)
- [ ] **Approval inventory + bulk revoke**
- [ ] **EIP-712 / typed data / Permit** clear-sign path
- [ ] **Custom contract call** (ABI/hex assist) for power/rescue
- [ ] **Address book** (label + warn new recipient)

## A3 — Accounts
- [ ] BIP44 multi-account discovery
- [ ] Passphrase / hidden wallet callouts
- [ ] Watch-only after disconnect (persisted registry)
- [ ] Export / import registry JSON

## B — DeFi (core: PulseX · ProveX)
- [ ] **PulseX** swap (quote → Trezor sign) — first-class, not “any DEX”
- [ ] Slippage / deadline controls
- [ ] **ProveX** entry: deep link / open app + USDC balance awareness
- [ ] Clear-sign ProveX escrow txs when user hits them via WC/Desk
- [ ] Other DEXes (Piteas/Switch/9mm) — BONUS only

## C — HEX companion (core app)
- [ ] Reuse pqq-wallet derivation + Connect adapter
- [ ] Portfolio view (stakes + liquid HEX on Pulse)
- [ ] Stake / end / good-accounting (exact-path sign)
- [ ] Advanced claim / migrate tools

## E — Power tools
- [ ] Portfolio snapshot helpers
- [ ] Migrate walks → product Advanced mode
- [ ] Connect e2e harness (fakes + device checklist)

## G — Ecosystem (desk-owned bits)
- [ ] Link Suite gap / upstream status from Desk UI or about page
- [ ] Cross-link Tip (mobile soft) + guides + rescue
- [ ] Consume SYNC registry / token pack from `pulse-trezor-platform`

## PLAT — Desk targets (this app)
- [ ] Windows (primary)
- [ ] Linux
- [ ] macOS (Apple)
- [ ] Web / PWA (Connect-web)
- [ ] WalletConnect host (dapps → Trezor) — see platform TODO

## AI — desk surface
- [ ] Explain / simulate pane (AI0–AI1) — agent never signs

## Release
- [ ] Versioned builds + update channel (Win first)
- [ ] Signed/notarized where OS requires (Mac later)
- [ ] Smoke checklist vs [ACCEPTANCE.md](./ACCEPTANCE.md) Gate 1

## Growth (Desk surfaces) — see [ADOPTION.md](./ADOPTION.md)
- [ ] First-run: Bridge → receive after Bridge guide
- [ ] Migrate-from-ETH wizard entry
- [ ] WC peer name “Pulse Desk” + Pulse chain
- [ ] Deep link / badge target for “Open in Desk”
- [ ] Watch-only mode pitched for Tip users (SYNC)

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
