# Extension ship surface — CWS-ready packaging (listing later)

**Status:** sideload / lab zip only. Chrome Web Store **listing not submitted**.  
Pack: `npm run ext:pack` → `dist-ext/pulse-perch-extension-<version>.zip` + `.sha256`.

## What we ship today
| Piece | Where |
|-------|--------|
| MV3 shell | `extension/` (manifest, inpage, content, background, perch-bridge, icons) |
| Zip + hash | `npm run ext:pack` |
| Install (lab) | `extension/README.md` · `scripts/chrome-ext-lab.ps1` |
| Privacy text (store-ready draft) | `extension/PRIVACY.md` |

## Install (operator)
1. Run desk (`npm run dev` → `:5174`) or host build.
2. Chrome → Extensions → Developer mode → **Load unpacked** → `extension/`  
   or unpack the release zip first.
3. Connect Trezor on the Perch tab; keep that tab open for signs.
4. Dapp tabs get `window.ethereum` (Perch). Prefer **Sites** (WalletConnect) when the dapp supports it.

## CWS listing checklist (do when ready to submit)
- [ ] Bump `extension/manifest.json` version; `npm run ext:pack`; record SHA256 in `extension/README.md`
- [ ] Host `extension/PRIVACY.md` (or equivalent) at a stable HTTPS URL — store requires a privacy policy link
- [ ] Store listing copy: single-purpose description (PulseChain Trezor inject; signs via open Perch desk)
- [ ] Screenshots: Connect · dapp inject · clear-sign on device (1280×800 / 640×400 as required)
- [ ] Single purpose justified; no unrelated host permissions creep — review `host_permissions` before submit
- [ ] Remote code: none (all scripts in package)
- [ ] Account for “desk tab must stay open” in support FAQ
- [ ] **Do not** claim official Trezor Pulse support
- [ ] Submit to Chrome Web Store (human; not automated here)

## Not in this pass
- Store upload / review cycle
- Firefox / Safari packaging
- Mobile
