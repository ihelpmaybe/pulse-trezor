import { describe, expect, it } from "vitest";
import {
  conflictsWithSuiteLinked,
  humanTrezorError,
  reconcileErrWithSuite,
} from "./errors";

describe("humanTrezorError", () => {
  it("maps Suite / transport missing", () => {
    expect(humanTrezorError("Suite websocket failed")).toMatch(/Suite/i);
    expect(humanTrezorError("Bridge not running on 21325")).toMatch(/Suite/i);
  });

  it("maps user cancel", () => {
    expect(humanTrezorError("Cancelled by user")).toMatch(/Cancelled/i);
  });

  it("maps popup closed without claiming Suite is down", () => {
    const msg = humanTrezorError("Popup closed by user");
    expect(msg).toMatch(/cancelled|Connect/i);
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
