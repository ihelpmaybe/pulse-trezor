export type SuiteProbe = "ok" | "missing" | "unknown" | "…";

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
    // Suite Desktop WS can still be linked — cancelled Allow/prompt, not Suite down.
    return "Connect cancelled (Suite prompt closed). Suite can stay linked — click Connect again.";
  }
  if (s.includes("popup") && (s.includes("block") || s.includes("blocked"))) {
    return "Allow popups for this site (Suite Web), then click Connect Trezor again.";
  }
  if (
    s.includes("local network") ||
    s.includes("private network") ||
    (s.includes("permission") && s.includes("network"))
  ) {
    return "Browser blocked Local Network Access to Trezor Suite. Allow local network, then retry.";
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
    return "No Trezor in Suite. Plug in (or attach Suite emu), unlock in Suite, then retry.";
  }
  if (
    s.includes("desktop_connectionmissing") ||
    s.includes("desktop connection") ||
    s.includes("connection missing")
  ) {
    return "Could not reach Suite Desktop WebSocket. Open Trezor Suite, then retry Connect.";
  }
  if (
    s.includes("suite") ||
    (s.includes("bridge") &&
      (s.includes("21325") ||
        s.includes("21335") ||
        s.includes("not running") ||
        s.includes("failed"))) ||
    s.includes("no transport") ||
    s.includes("transport is missing") ||
    s.includes("websocket")
  ) {
    return "Trezor Suite not reachable. Open Suite Desktop (preferred) or allow the Suite Web popup, then retry.";
  }
  return raw;
}

/** True if the banner would contradict a green “Suite linked” chip. */
export function conflictsWithSuiteLinked(msg: string): boolean {
  const s = msg.toLowerCase();
  // Already reconciled — ok to show beside Suite linked.
  if (
    s.includes("still linked") ||
    s.includes("can stay linked") ||
    s.includes("suite is running but") ||
    s.includes("suite is still") ||
    s.includes("suite linked —") ||
    s.includes("suite is linked")
  ) {
    return false;
  }
  return (
    s.includes("not reachable") ||
    s.includes("could not reach suite") ||
    s.includes("could not reach suite desktop") ||
    s.includes("open trezor suite") ||
    s.includes("window closed") ||
    s.includes("suite window") ||
    s.includes("not initialized") ||
    (s.includes("suite") && s.includes("closed")) ||
    (s.includes("open suite") && !s.includes("allow"))
  );
}

/**
 * Face display: never show “Suite is down” next to a successful Suite probe.
 * Connect-cancel / Allow timeouts stay, but worded so they match the chip.
 */
export function reconcileErrWithSuite(
  err: string | null,
  suite: SuiteProbe,
): string | null {
  if (!err) return null;
  if (suite !== "ok") return err;
  if (/not initialized/i.test(err)) return null;
  if (!conflictsWithSuiteLinked(err)) return err;
  return "Connect cancelled. Suite is still linked — click Connect again.";
}
