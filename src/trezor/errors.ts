/**
 * Operator-facing Connect / Suite errors.
 * MetaMask eth-trezor-keyring: map Connect `code` + payload.error (not a second keyring).
 */
export type SuiteProbe = "ok" | "missing" | "unknown" | "…";

/** Connect unsuccessful payload — MM `createErrorFromTrezorResponse`. */
export type TrezorFailPayload = {
  error?: string;
  code?: string;
};

/**
 * Prefer Connect machine `code` (Method_Cancel, Device_Disconnected, …)
 * then human error string — MM bridge-error pattern.
 */
export function messageFromTrezorPayload(
  payload?: TrezorFailPayload | null,
  fallback = "Trezor not available",
): string {
  const code = (payload?.code || "").trim();
  const err = (payload?.error || "").trim();
  const raw = [code, err].filter(Boolean).join(" ") || fallback;
  return humanTrezorError(raw);
}

/** True when Connect's window.open('about:blank') was blocked by the browser. */
export function isPopupBlockedError(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const s = raw.toLowerCase();
  return (
    s.includes("popup-blocked") ||
    s.includes("about:blank") ||
    (s.includes("popup") &&
      (s.includes("block") || s.includes("blocked") || s.includes("allow"))) ||
    (s.includes("trezor") &&
      s.includes("allow window") &&
      s.includes("blocked"))
  );
}

export function humanTrezorError(raw: string): string {
  const s = raw.toLowerCase();

  // —— MetaMask keyring Connect codes (TREZOR_ERROR_MAPPINGS peers) ——
  if (
    s.includes("method_permissionsnotgranted") ||
    s.includes("permissionsnotgranted")
  ) {
    return "Suite did not Allow Pulse Perch — open Suite, Allow this app, then retry.";
  }
  if (s.includes("method_interrupted") || s.includes("method interrupted")) {
    return "Suite call interrupted — another prompt may be open. Finish or Stop waiting, then retry.";
  }
  if (
    s.includes("method_cancel") ||
    (s.includes("method_") && s.includes("cancel") && !s.includes("failure_"))
  ) {
    // MM: Method_Cancel = user closed Connect UI — not device reject (Taho).
    return "Connect cancelled (Suite prompt closed). Suite can stay linked — click Connect again.";
  }
  if (
    s.includes("device_disconnected") ||
    (s.includes("device_disconnect") && !s.includes("unacquired"))
  ) {
    return "Trezor disconnected from Suite. Plug in, unlock in Suite, then retry.";
  }
  if (s.includes("device_usedelsewhere") || s.includes("used elsewhere")) {
    return "Trezor is busy in another app/tab — Acquire device or close the other session, then retry.";
  }

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
  if (
    s.includes("popup-blocked") ||
    s.includes("handshake_error") ||
    (s.includes("popup") && (s.includes("block") || s.includes("blocked")))
  ) {
    return "Chrome blocked Trezor's allow window (it may list about:blank). That is not your wallet tab — allow pop-ups for this address, then use Open Trezor window.";
  }
  if (
    s.includes("local network") ||
    s.includes("private network") ||
    (s.includes("permission") && s.includes("network"))
  ) {
    return "Browser blocked Local Network Access to Trezor Suite. Allow local network, then retry.";
  }
  // Taho law: UI abort ≠ device reject. Only the device can reject a HW prompt.
  if (
    s.includes("user-cancel") ||
    s.includes("stopped waiting") ||
    (s.includes("cancel") && (s.includes("perch") || s.includes("ui")))
  ) {
    return "Stopped waiting in Perch. If Suite still shows a prompt, confirm or reject on the device.";
  }
  if (
    s.includes("rejected") ||
    s.includes("user denied") ||
    s.includes("failure_actioncancelled") ||
    s.includes("failure_action_cancelled") ||
    s.includes("actioncancelled") ||
    (s.includes("cancel") && s.includes("device"))
  ) {
    return "Rejected on the Trezor — try again when ready.";
  }
  if (s.includes("cancel")) {
    // Ambiguous Connect cancel — do not claim the device rejected.
    return "Stopped waiting. Check Suite / the device if a prompt is still open, then retry.";
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
