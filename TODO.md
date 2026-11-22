# TODO — pulse-trezor (Desk / HWW)

This repo only. Program-wide map: [ROADMAP.md](./ROADMAP.md) · [END-TO-END.md](./END-TO-END.md)

Legend: `[ ]` todo · `[x]` done

## A0 — Bootstrap
- [ ] App shell (Vite + Connect patterns)
- [ ] Warm Connect + Bridge; human-readable errors
- [ ] Connect / disconnect; address matches device screen
- [ ] Pulse RPC + explorer links (chain 369)

## A1 — Core custody
- [ ] Receive + verify-on-device
- [ ] PLS balance
- [ ] Send PLS (prepare → Trezor sign → broadcast)
- [ ] **Fee / gas UI** (estimate, bump; stuck tx speed-up/cancel if feasible)
- [ ] Tx status + basic history
- [ ] **Indexer decision** (scan API vs self-host) — document in platform
- [ ] **Testnet V4 (943)** toggle for safe e2e
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

## B — DeFi
- [ ] One swap venue (quote → Trezor sign)
- [ ] Slippage / deadline controls
- [ ] Second venue later

## C — HEX companion
- [ ] Reuse pqq-wallet derivation + Connect adapter
- [ ] Portfolio view (stakes + liquid HEX)
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

## Ship order (this repo)
1. A0 → A1 (Win, Bridge, fees, history) → A2 → SYNC hooks → A3 → Lin/Mac/Web → C → B → WC → AI → E
