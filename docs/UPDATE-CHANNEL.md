# Update channel

**Channel:** `desk-web` · app version from `package.json` · extension from `extension/manifest.json`.

## How updates work today (honest)
- **No auto-updater.** You pull git (or grab a zip) and rebuild / refresh.
- **Desk (dev):** `git pull` → `npm run setup` if deps changed → `npm run dev` (or `npm run build` + `npm run preview`).
- **PWA:** Chrome “Install Pulse Perch” from the desk origin (Settings → Install, or address-bar icon). Hard-refresh or unregister SW if a shell cache sticks. Manifest: `public/manifest.webmanifest`. SW `shell-v4` caches shell + `/offline.html` + `/assets/*` only — never RPC/scan. Offline banner warns Suite/RPC need a network.
- **Portable zip:** `npm run build && npm run desk:pack` → `release/pulse-perch-<ver>-web.zip` + `.sha256` ([DESKTOP-PACK.md](./DESKTOP-PACK.md)). Unzip and serve statically — **unsigned web assets**, not an installer.
- **Extension:** `npm run ext:pack` → `dist-ext/pulse-perch-extension-<ver>.zip` + `.sha256`; reload unpacked / sideload zip. See [EXT-CWS-READY.md](./EXT-CWS-READY.md).

## Check for updates (manual)
1. Compare local `package.json` / extension version to GitHub `main`.
2. Optional later: static `latest.json` on a release host (no telemetry).

## Settings face
Settings → About repeats the same rule: rebuild / refresh · hard-refresh PWA · `desk:pack` for portable zip · no auto-updater.

## Later (OPEN)
- Signed Windows pack + versioned feed URL
- Notarized macOS
- Chrome Web Store auto-update once listed (not a goal today)
