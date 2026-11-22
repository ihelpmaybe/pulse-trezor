export function humanTrezorError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("manifest")) {
    return "Trezor Connect failed to init (manifest). Reload the page.";
  }
  if (
    s.includes("popup closed") ||
    s.includes("window closed") ||
    s.includes("closed by user") ||
    (s.includes("popup") && s.includes("closed"))
  ) {
    return "Trezor window closed. Try again and leave Connect open.";
  }
  if (s.includes("popup") && (s.includes("block") || s.includes("blocked"))) {
    return "Allow popups for this site, then click Connect Trezor again.";
  }
  if (
    s.includes("local network") ||
    s.includes("private network") ||
    (s.includes("permission") && s.includes("network"))
  ) {
    return "Browser blocked Local Network Access to the Trezor bridge. Allow local network, then retry.";
  }
  if (
    s.includes("cancel") ||
    s.includes("rejected") ||
    s.includes("user denied")
  ) {
    return "Cancelled on Trezor — try again when ready.";
  }
  if (
    s.includes("device") &&
    (s.includes("not found") || s.includes("disconnected"))
  ) {
    return "No Trezor on the bridge. Plug in (or start Suite emu), then retry.";
  }
  if (
    (s.includes("bridge") &&
      (s.includes("21325") ||
        s.includes("not running") ||
        s.includes("failed"))) ||
    s.includes("no transport") ||
    s.includes("transport is missing")
  ) {
    return "No Trezor Bridge on :21325. Install/start Trezor Suite Bridge, then retry.";
  }
  return raw;
}
