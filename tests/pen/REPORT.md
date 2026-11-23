# Pen report — Pulse Perch (Gate 1 gate)

**Status:** IN PROGRESS — code-proven rows marked; manual device rows still open. Not a PASS.

| Date | Tester | Build |
|---|---|---|
| 2026-11-22 | desk agent (code) + TBD manual | `0.1.0` |

## Scope

Hardware path only: Connect 10 → Suite → Trezor. Desk bag / send / approve / Sites / sign on Pulse (369) + lab (943).

## Checklist

- [x] No seed / private key in logs, localStorage dumps, or AI bridge — watch import + fuzz reject seed-like fields (`npm run fuzz`)
- [x] Watch JSON import rejects seed-like payloads — unit + fuzz
- [x] WC phishing origin blocked from Approve session — `wcOrigins` / clearSign warn path
- [x] `wallet_addEthereumChain` / unknown switch rejected — EIP-1193 unit tests
- [x] Blind calldata requires extra ack before Sign — WC checkbox gate
- [x] Approve / Permit clear-sign shows spender — Approvals + WC strip
- [x] Custom contract call warns power-user — Send details + TxExplain
- [ ] Suite-down / cancel-on-device honest errors (manual)
- [x] Extension / inject does not bypass Trezor — signs still host → Connect path
- [x] WC origin shown before sign — Sites panel
- [x] Deep link `?uri=` / `web+pulseperch:` lands on Sites (no silent sign)

## Findings

| ID | Severity | Note | Status |
|---|---|---|---|
| — | — | No new ship-blocker from this pass | open for manual Suite-down |

## Sign-off

Gate 1 not cleared until FULL smoke + this report dated &lt; 30 days + manual Suite-down / cancel rows.
