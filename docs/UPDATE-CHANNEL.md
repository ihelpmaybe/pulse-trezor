# Update channel (stub)

**Channel:** `desk-web` · version from `package.json` (`0.1.0`).

## How updates work today
- Pull / rebuild the desk (Vite). No auto-updater yet.
- PWA: hard-refresh or unregister SW if a shell cache sticks.

## Later
- Signed Windows pack + versioned feed URL
- Optional “Check for updates” that GETs a static `latest.json` (no telemetry)
