import { describe, expect, it } from "vitest";
import {
  conflictsWithSuiteLinked,
  humanTrezorError,
  messageFromTrezorPayload,
  reconcileErrWithSuite,
} from "./errors";

describe("humanTrezorError", () => {
  it("maps Suite / transport missing", () => {
    expect(humanTrezorError("Suite websocket failed")).toMatch(/Suite/i);
    expect(humanTrezorError("Bridge not running on 21325")).toMatch(/Suite/i);
  });

  it("maps UI stop-waiting without claiming device reject (Taho)", () => {
    expect(humanTrezorError("user-cancel")).toMatch(/Stopped waiting/i);
    expect(humanTrezorError("user-cancel")).not.toMatch(/Rejected on the Trezor/i);
    expect(humanTrezorError("Cancelled by user")).toMatch(/Stopped waiting|Check Suite/i);
    expect(humanTrezorError("Cancelled by user")).not.toMatch(/Rejected on the Trezor/i);
  });

  it("maps MM Connect codes (Method_* / Device_*)", () => {
    expect(humanTrezorError("Method_Cancel")).toMatch(/cancelled|Connect/i);
    expect(humanTrezorError("Method_Cancel")).not.toMatch(/Rejected on the Trezor/i);
    expect(humanTrezorError("Method_PermissionsNotGranted")).toMatch(/Allow/i);
    expect(humanTrezorError("Method_Interrupted")).toMatch(/interrupted/i);
    expect(humanTrezorError("Device_Disconnected")).toMatch(/disconnected/i);
  });

  it("maps payload code via messageFromTrezorPayload", () => {
    expect(
      messageFromTrezorPayload({ code: "Method_Cancel", error: "Cancelled" }),
    ).toMatch(/cancelled|Connect/i);
  });

  it("maps true device reject separately", () => {
    expect(humanTrezorError("Failure_ActionCancelled")).toMatch(/Rejected on the Trezor/i);
    expect(humanTrezorError("user denied")).toMatch(/Rejected on the Trezor/i);
  });

  it("maps popup closed without claiming Suite is down", () => {
    const msg = humanTrezorError("Popup closed by user");
    expect(msg).toMatch(/cancelled|Connect|Stopped/i);
    expect(msg).not.toMatch(/not reachable/i);
    expect(conflictsWithSuiteLinked(msg)).toBe(false);
  });

  it("passes through unknown", () => {
    expect(humanTrezorError("weird xyz")).toBe("weird xyz");
  });
});

describe("reconcileErrWithSuite", () => {
  it("rewrites suite-down copy when Suite is linked", () => {
    expect(
      reconcileErrWithSuite(
        "Trezor / Suite window closed. Try again and leave it open.",
        "ok",
      ),
    ).toMatch(/still linked/i);
    expect(
      reconcileErrWithSuite(
        "Trezor Suite not reachable. Open Suite Desktop (preferred) or allow the Suite Web popup, then retry.",
        "ok",
      ),
    ).toMatch(/still linked/i);
  });

  it("drops not-initialized under Suite linked", () => {
    expect(reconcileErrWithSuite("Call .init() first — not initialized", "ok")).toBe(
      null,
    );
  });

  it("keeps honest Allow timeouts that already name Suite running", () => {
    const msg =
      "Suite is running but did not finish Allow. Check Suite, Allow Pulse Perch, then Load accounts again.";
    expect(reconcileErrWithSuite(msg, "ok")).toBe(msg);
  });

  it("leaves suite-down copy alone when Suite is missing", () => {
    const msg = humanTrezorError("Suite websocket failed");
    expect(reconcileErrWithSuite(msg, "missing")).toBe(msg);
  });
});
