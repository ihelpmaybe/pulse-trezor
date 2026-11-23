# MV3 cross-origin provider events — 2026-11-23

**Result: PASS (live CDP)** · extension `0.1.2` · desk `:5174` · dapp `example.com`

## Path
1. Desk notifies via `window.postMessage` (`pulse-perch-page-bridge` / `provider-event`)
2. `perch-bridge.js` → `chrome.runtime.sendMessage` (`eip1193-broadcast`)
3. `background.js` → every http(s) tab except desk → `eip1193-event`
4. `content.js` → page `postMessage` (`pulse-perch-ext` / `event`)
5. `inpage.js` emits to `ethereum.on(...)`

## Live probe
Script: `node scripts/ext-events-smoke.mjs` → `EXT_EVENTS_OK` · artifact `tmp-ext-events.json`

| Check | Result |
|-------|--------|
| Connect #1 + inject on example.com | PASS · `eth_chainId` `0x3af` |
| Desk network 943 → 369 | PASS |
| dapp `chainChanged` | PASS |
| dapp `accountsChanged` (fan-out on notify) | PASS |
| Switch Account #2 | SKIP · only #1 connected this pass |

## Also
- Request path unchanged (`EXT-MV3-2026-11-22.md`)
- `inpage.js` joins `ethereum.providers[]` when another wallet is present
