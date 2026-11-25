# Pen report — Pulse Perch (Gate 1 gate)

**Status:** PASS (desk pen rows) · 2026-11-23 — cancel + Suite-quit honest. FULL matrix / multi-OS still later.

| Date | Tester | Build |
|---|---|---|
| 2026-11-22 | desk agent (code + emu lab) | `0.1.0` · `7cd5691` |
| 2026-11-23 | desk agent (Suite-quit live) | desk Vite · Suite Desktop restarted |

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
- [x] Suite-down / cancel-on-device honest errors — cancel PASS; Suite-quit PASS · [SUITE-DOWN-CANCEL-2026-11-22.md](../smoke/SUITE-DOWN-CANCEL-2026-11-22.md)
- [x] Extension / inject does not bypass Trezor — signs still host → Connect path
- [x] WC origin shown before sign — Sites panel
- [x] Deep link `?uri=` / `web+pulseperch:` lands on Sites (no silent sign)

## Findings

| ID | Severity | Note | Status |
|---|---|---|---|
| P-SD1 | Low | After Suite kill, header can keep “· Suite” until Connect/Load re-probes; action path flips to “open Suite” + honest alert | accepted · not ship-blocker |

## Sign-off

Desk pen checklist green as of 2026-11-23. Gate 1 desk claim holds with smoke + this report (&lt; 30 days). FULL OS×device matrix still open (not required to claim desk Gate 1 slice).

**Before next release tag:** run [RE-PEN-BEFORE-TAG.md](./RE-PEN-BEFORE-TAG.md) if this date is stale or Connect/WC/inject moved a lot.
