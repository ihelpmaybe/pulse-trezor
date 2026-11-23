# Suite-down / cancel-on-device — lab notes

**Status: PASS** (cancel 2026-11-22 · Suite-quit 2026-11-23)

## What exists
- `cancelTrezorConnect` + Cancel while Connecting / Signing on face
- `reconcileErrWithSuite` — no “Suite down” beside green Suite linked
- Device/user cancel surfaces via `humanTrezorError`

## Lab checks (testnet / emu — no mainnet)

| # | Check | Result | Time (local) | Evidence |
|---|---|---|---|---|
| 1 | Start Connect → Cancel / device reject before finish | PASS | 2026-11-22 ~20:02 | Face alert: “Cancelled on Trezor — try again when ready.” · idle Connect button restored |
| 2 | Suite Confirm open → Cancel on Perch | code-ready | — | Cancel button present while “Connecting…”; not re-timed this pass |
| 3 | Quit Suite mid-session → honest reconcile | **PASS** | 2026-11-23 ~00:58 | Quit Suite → Load accounts → chip **open Suite** + alert “Trezor Suite not reachable…” · **no** green Suite + down contradiction · Suite restarted · `scripts/suite-down-smoke.mjs` → `SUITE_DOWN_OK` · `tmp-suite-down.json` |

## Notes
- Unit coverage: `src/trezor/errors.test.ts` (cancel vs Suite-linked reconcile).
- Chip can stay stale “Suite” for a while after kill until a Connect/Load path re-probes — on action it flips correctly. Not a ship-blocker.
