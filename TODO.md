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
- [ ] Tx status + basic history

## A2 — Tokens
- [ ] Token list: HEX, PLSX, INC, custom add-by-contract
- [ ] Token balances
- [ ] Send ERC-20
- [ ] Approve / revoke UI (spender, amount clear)

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

## Ship order (this repo)
1. A0 → A1 → A2 → A3 → C thin → B → E
