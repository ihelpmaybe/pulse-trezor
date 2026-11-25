# Gate 1 checklist — HWW without MetaMask (Desk)

Maps to [ACCEPTANCE.md](../ACCEPTANCE.md) **Gate 1** + Desk rows under **Gate T**.  
**Primary lab:** Windows + Trezor Suite Desktop + this desk (`:5174` / build).  
**Honesty:** desk claim ≠ marketing “complete Gate 1” (see Sign-off).

## ACCEPTANCE Gate 1 ↔ this desk

| ACCEPTANCE item | Desk status | Evidence |
|-----------------|-------------|----------|
| Desk A0–A2 on Windows | **PASS** | Connect · bag · send · approve · Activity |
| Bridge / Suite first-run | **PASS** | FirstRunStrip + suite-allow callout (Connect 10 → Suite) |
| Receive / send PLS + HEX/PLSX | **PASS** (943 dust; 369 send UI) | smoke GATE-T / ERC20; mainnet WC spend soft |
| Fee UI + basic history | **PASS** UI · RBF device **OPEN** | fee preview + Activity; [RBF-STUCK-PLAYBOOK.md](./RBF-STUCK-PLAYBOOK.md) |
| Gate T green for Desk | **PASS** CI · FULL matrix **OPEN** | `npm run smoke` + pen; OS matrix incomplete |

## Product surface
- [x] A0–A2: Connect · bag · send PLS/ERC-20 · approve/revoke · fees/RBF UI · Activity
- [x] Sites WC: personal_sign · EIP-712 (live smokes 2026-11-22)
- [ ] Sites WC: **tx / swap** on Pulse mainnet 369 (needs dust) — soft coach only ([SITES-WC-SEND-TX](../tests/smoke/SITES-WC-SEND-TX-2026-11-22.md))
- [x] Sites WC: HEX stakeStart / stakeEnd clear-sign companions (decode + Stakes tab path copy)
- [x] Inject / MV3 cross-origin + event fan-out (`0.1.4` offscreen + session cache)
- [x] First-run / Suite cues / Cancel (`FirstRunStrip` + suite-allow callout)
- [x] Testnet 943 toggle

## Gate T (Desk)
- [x] CI `npm run smoke` (typecheck · build · vitest · fuzz)
- [x] Pen report `tests/pen/REPORT.md` (cancel + Suite-quit PASS) · re-pen stub [RE-PEN-BEFORE-TAG.md](../tests/pen/RE-PEN-BEFORE-TAG.md)
- [x] Manual smokes under `tests/smoke/` (send dust 943, inject, WC EIP-712, Suite-down)
- [x] a11y **contract** smoke — `src/a11y/a11y.smoke.test.ts` (labels / live regions / FirstRun / Suite Allow)
- [ ] a11y **human** pass — [NVDA-CHECKLIST.md](../tests/a11y/NVDA-CHECKLIST.md) (OPEN until ticked)
- [ ] FULL OS×device matrix — see [OS-DEVICE-MATRIX.md](./OS-DEVICE-MATRIX.md)

## Ship / update
- [x] Update channel stub — [UPDATE-CHANNEL.md](./UPDATE-CHANNEL.md)
- [x] PWA webmanifest + icons (`public/manifest.webmanifest`)
- [x] PWA: installable + offline shell SW (`public/sw.js` shell-v4 + offline.html; never caches RPC)
- [ ] Live stuck-tx RBF on device — fee math + Anvil PASS; face soft coach; device OPEN ([RBF-STUCK-PLAYBOOK.md](./RBF-STUCK-PLAYBOOK.md))
- [x] Portable desk zip+sha — `desk:pack` smoke 2026-11-24 (`tests/smoke/DESK-PACK.md`); Authenticode/notarize OPEN ([DESKTOP-PACK.md](./DESKTOP-PACK.md))
- [x] Extension sideload pack + CWS-ready docs (listing later)
- [x] Update channel honesty — Settings + [UPDATE-CHANNEL.md](./UPDATE-CHANNEL.md) (no auto-updater)

## Sign-off
Gate 1 **desk claim** holds on Windows for custody + Sites sign + inject.  
Blocked for “complete Gate 1” marketing: mainnet Sites **tx** proof + FULL matrix rows + human NVDA tick + device RBF evidence.
