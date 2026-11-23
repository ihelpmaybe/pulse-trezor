# Desktop pack · signing / notarize

**Preferred ship today:** PWA install + `npm run desk:pack` (zip of `dist/` + SHA256). Not an Electron/Tauri app.

## Portable web pack

```bash
npm run build
npm run desk:pack
# → release/pulse-perch-<version>-web.zip + .sha256
```

Serve the unzipped folder locally (`npx serve dist` or your host). Suite still required for Trezor.

## Windows Authenticode (later)

- Needs a code-signing cert (EV preferred for SmartScreen).
- Sign only if wrapping in an installer/exe — raw zip of static assets usually unsigned.
- Checklist: SignTool · timestamp server · verify `Get-AuthenticodeSignature`.

## macOS notarize (later)

- Needs Apple Developer ID + notarization of a **native** wrapper (not this zip).
- Leave matrix macOS cells OPEN until a real signed .app exists.
- Do not claim “notarized” for an unsigned zip or PWA.

## Linux

- Zip / AppImage only if you add a native shell later. Today: PWA or local static serve.

## Honesty bar
Signed/notarized = **OPEN** until certs + wrapper exist. This doc is the checklist, not a fake green cell.
