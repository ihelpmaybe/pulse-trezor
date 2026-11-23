# MV3 cross-origin provider events — 2026-11-23

**Change:** extension `0.1.2` fans desk `accountsChanged` / `chainChanged` to open dapp tabs.

## Path
1. Desk notifies via `window.postMessage` (`pulse-perch-page-bridge` / `provider-event`)
2. `perch-bridge.js` → `chrome.runtime.sendMessage` (`eip1193-broadcast`)
3. `background.js` → every http(s) tab except desk → `eip1193-event`
4. `content.js` → page `postMessage` (`pulse-perch-ext` / `event`)
5. `inpage.js` already emits to `ethereum.on(...)`

## Also
- Request path unchanged (already PASS in `EXT-MV3-2026-11-22.md`)
- `inpage.js` joins `ethereum.providers[]` when another wallet is present

## Manual check
1. Desk Connected on `:5174` · unpacked `0.1.2`
2. Dapp tab with `ethereum.on('accountsChanged', …)` / `chainChanged`
3. Switch account or chain on desk → dapp listener fires without reload
