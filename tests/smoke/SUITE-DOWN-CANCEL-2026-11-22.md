# Suite-down / cancel-on-device — lab notes (2026-11-22)

**Status: CODE PATHS READY · manual re-smoke when convenient**

## What exists
- `cancelTrezorConnect` + Cancel while Connecting / Signing on face
- `reconcileErrWithSuite` — no “Suite down” beside green Suite linked
- Device/user cancel surfaces via `humanTrezorError`

## Lab checks (testnet / emu — no mainnet)
1. Start Sign & send → Cancel before Suite Confirm → Perch idle, no stuck Signing
2. Suite Confirm open → Cancel on Perch → Connect cancel; no zombie button-request (yield before next YES)
3. Quit Suite mid-session → face shows honest missing/linked reconcile, not conflicting banners

## Not claiming PASS until one timed re-run with evidence clip
