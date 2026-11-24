import { describe, expect, it } from "vitest";
import {
  connectSteps,
  shouldOfferFirmwareHelp,
} from "./DeviceConnectFace";

describe("connectSteps", () => {
  it("marks Open Suite current when desktop missing and idle", () => {
    const steps = connectSteps({
      suiteChannel: "web-or-missing",
      connecting: false,
      hasSession: false,
    });
    expect(steps[0].state).toBe("current");
    expect(steps[1].state).toBe("todo");
    expect(steps[2].state).toBe("todo");
  });

  it("marks Allow current while connecting", () => {
    const steps = connectSteps({
      suiteChannel: "desktop",
      connecting: true,
      hasSession: false,
    });
    expect(steps[0].state).toBe("done");
    expect(steps[1].state).toBe("current");
    expect(steps[2].state).toBe("todo");
  });

  it("marks Ready done when session exists", () => {
    const steps = connectSteps({
      suiteChannel: "desktop",
      connecting: false,
      hasSession: true,
    });
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });
});

describe("shouldOfferFirmwareHelp", () => {
  it("offers on outdated or Suite-down copy", () => {
    expect(shouldOfferFirmwareHelp(null, true)).toBe(true);
    expect(
      shouldOfferFirmwareHelp("Trezor Suite not reachable. Open Suite…", false),
    ).toBe(true);
    expect(shouldOfferFirmwareHelp("Amount must be > 0.", false)).toBe(false);
  });
});
