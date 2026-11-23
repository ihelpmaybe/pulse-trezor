# Suite-down / cancel-on-device — lab notes (2026-11-22)

**Status: PARTIAL PASS (timed cancel evidence) · Suite-down quit still open**

## What exists
- `cancelTrezorConnect` + Cancel while Connecting / Signing on face
- `reconcileErrWithSuite` — no “Suite down” beside green Suite linked
- Device/user cancel surfaces via `humanTrezorError`

## Lab checks (testnet / emu — no mainnet)

| # | Check | Result | Time (local) | Evidence |
|---|---|---|---|---|
| 1 | Start Connect → Cancel / device reject before finish | PASS | ~20:02 | Face alert: “Cancelled on Trezor — try again when ready.” · idle Connect button restored |
| 2 | Suite Confirm open → Cancel on Perch | code-ready | — | Cancel button present while “Connecting…”; not re-timed this pass |
| 3 | Quit Suite mid-session → honest reconcile | OPEN | — | Needs Suite quit while linked |

## Notes
- Suite Grant Permissions dialog for Pulse Perch was live on primary (PQQ-SMOKE) during Connect.
- Unit coverage: `src/trezor/errors.test.ts` (cancel vs Suite-linked reconcile).
