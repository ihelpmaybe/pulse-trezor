# OS × device matrix (Desk)

**Legend:** PASS = evidenced smoke · OPEN = not run here · N/A = not targeted yet

| OS | Suite Desktop | Safe 3 | Safe 5 | Safe 7 | Trezor emu | Notes |
|----|---------------|--------|--------|--------|------------|-------|
| Windows 10/11 | PASS (lab 2026-11) | OPEN | OPEN | OPEN | PASS (lab) | Primary |
| Linux | OPEN | OPEN | OPEN | OPEN | OPEN | Connect-web same path |
| macOS | OPEN | OPEN | OPEN | OPEN | OPEN | Notarize later — see DESKTOP-PACK |
| Web / PWA only | PASS (desk) | — | — | — | via Suite | Installable; SW shell-v3 |

## Journeys to tick per cell
Receive · send PLS · ERC-20 · approve · Sites personal_sign · (mainnet tx when dust) · Speed up / Cancel stuck (943 RBF playbook)

## This machine
Windows lab: smoke + pen + MV3 events green as of 2026-11-23. **Do not mark Lin/Mac PASS without a run on that OS.**

## Lin / Mac runbook (when you have that box)

Same codepath as Win (Connect-web → Suite). Do not invent a parallel unlock.

1. Clone / sync this repo; `npm run setup` · `npm run smoke`.
2. Install **Trezor Suite Desktop** for that OS (or Suite Web). Bridge must be up.
3. `npm run dev` → open desk `:5174` (or preview build).
4. Tick journeys above on **one** device cell (emu OK for first PASS).
5. Paste results into this table (date + device model). Leave other cells OPEN.
6. Optional: `npm run desk:pack` → SHA256 of zip; signing/notarize per [DESKTOP-PACK.md](./DESKTOP-PACK.md).

### Blockers that are not “desk bugs”
- Suite/bridge not installed · udev (Linux) · Gatekeeper (macOS) · missing USB
- Fake PASS forbidden — leave OPEN
