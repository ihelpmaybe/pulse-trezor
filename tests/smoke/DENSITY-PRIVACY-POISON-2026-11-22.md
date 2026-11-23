# Desk density / privacy / poison — 2026-11-22

**Status: PASS (unit + fuzz; no device)**

## Shipped
- Account cards: one-row `#N · addr · PLS · HEX mark`
- Balances head: Account #N + Tokens/NFTs
- Activity: lookalike / dust poison `!` vs book + prior Outs
- Dox shield: eye next to Settings cog → `********` + block addr copy
- Phishing: `trezor-suite-login` / suite-login hosts

## Evidence
- `npm test` (incl. `extreme.sim.test.ts`, `addressBook.test.ts`)
- `npm run fuzz`
- `npm run typecheck`

## Still open (needs Suite / you)
- Live WC **sign** after Sites pair (message-sign OK if 0 PLS)
- Suite-down / cancel manual re-smoke (`SUITE-DOWN-CANCEL-2026-11-22.md`)
