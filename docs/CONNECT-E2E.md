# Connect e2e harness

**Software under test:** Perch Connect face + error map + (optional) official lab wire.  
**Not:** Chrome Web Store · soft-seed “Trezor” · store listing.

## Modes

| Mode | Command | Proves |
|------|---------|--------|
| **fake** (default) | `npm run connect:e2e` | Face steps + Connect error strings (CI-safe) |
| **lab** | `npm run connect:e2e -- lab` | trezor-user-env controller on `:9001` is up |
| **checklist** | `npm run connect:e2e -- checklist` | Prints device/emu operator list |

Fake **never** means hardware. Lab up **never** means Perch Connected — still need Suite Allow.

## Wire (don’t-pretend)

`Perch → @trezor/connect-web → Suite → Bridge → real device | official emu`

Code: `src/trezor/connectHarness.ts` · runner `scripts/connect-e2e-harness.mjs` · lab `scripts/lab-user-env.ps1`.

## Device / emu evidence

Paste one line under `tests/connect/` when you run the real path:

| Date | Path | Result |
|------|------|--------|
| — | — | OPEN until Suite Allow + address match logged |

## Kill_if

Software HD / mnemonic unlock labeled as Trezor or “lab emu” that skips Suite.
