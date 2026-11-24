# Gate 1 checklist — HWW without MetaMask (Desk)

Maps to [ACCEPTANCE.md](./ACCEPTANCE.md) Gate 1 + [TESTING.md](./TESTING.md).  
**Primary lab:** Windows + Trezor Suite Desktop + this desk (`:5174` / build).

## Product surface
- [x] A0–A2: Connect · bag · send PLS/ERC-20 · approve/revoke · fees/RBF · Activity
- [x] Sites WC: personal_sign · EIP-712 (live smokes 2026-11-22)
- [ ] Sites WC: **tx / swap** on Pulse mainnet 369 (needs dust)
- [x] Inject / MV3 cross-origin + event fan-out (`0.1.4` offscreen + session cache)
- [x] First-run / Suite cues / Cancel
- [x] Testnet 943 toggle

## Gate T (Desk)
- [x] CI `npm run smoke` (typecheck · build · vitest · fuzz)
- [x] Pen report `tests/pen/REPORT.md` (cancel + Suite-quit PASS)
- [x] Manual smokes under `tests/smoke/` (send dust 943, inject, WC EIP-712, Suite-down)
- [ ] FULL OS×device matrix — see [OS-DEVICE-MATRIX.md](./OS-DEVICE-MATRIX.md)

## Ship / update
- [x] Update channel stub — [UPDATE-CHANNEL.md](./UPDATE-CHANNEL.md)
- [x] PWA webmanifest + icons (`public/manifest.webmanifest`)
- [x] PWA: installable + offline shell SW (`public/sw.js` shell-v3; never caches RPC)
- [ ] Live stuck-tx RBF on device — fee math PASS; playbook [RBF-STUCK-PLAYBOOK.md](./RBF-STUCK-PLAYBOOK.md)
- [~] Desktop signed/notarized packs — zip+sha via `desk:pack`; Authenticode/notarize OPEN ([DESKTOP-PACK.md](./DESKTOP-PACK.md))
- [x] Extension sideload pack + CWS-ready docs (listing later)

## Sign-off
Gate 1 **desk claim** holds on Windows for custody + Sites sign + inject.  
Blocked for “complete Gate 1” marketing: mainnet Sites **tx** proof + FULL matrix rows.
