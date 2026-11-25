# Update channel

**Channel:** `desk-web` · app version from `package.json` · extension from `extension/manifest.json`.

## How updates work today
- **Desk:** pull git → `npm run build` / `npm run dev`. No auto-updater.
- **PWA:** Chrome “Install Pulse Perch” from the desk origin (Settings → Install, or address-bar icon). Hard-refresh or unregister SW if a shell cache sticks. Manifest: `public/manifest.webmanifest`. SW `shell-v4` caches shell + `/offline.html` + `/assets/*` only — never RPC/scan. Offline banner warns Suite/RPC need a network.
- **Portable zip:** `npm run build && npm run desk:pack` → `release/*.zip` + `.sha256` ([DESKTOP-PACK.md](./DESKTOP-PACK.md)).
- **Extension:** `npm run ext:pack` → `dist-ext/pulse-perch-extension-<ver>.zip` + `.sha256`; reload unpacked / sideload zip. See [EXT-CWS-READY.md](./EXT-CWS-READY.md).

## Check for updates (manual)
1. Compare local `package.json` / extension version to GitHub `main`.
2. Optional later: static `latest.json` on a release host (no telemetry).

## Later
- Signed Windows pack + versioned feed URL
- Notarized macOS
- Chrome Web Store auto-update once listed
