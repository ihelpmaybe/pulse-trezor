import { describe, expect, it } from "vitest";
import {
  CONNECT_DEVICE_CHECKLIST,
  CONNECT_FACE_SCENARIOS,
  fakeConnectFailureHuman,
  harnessBanner,
  runAllFaceScenarios,
  runFaceScenario,
} from "./connectHarness";

describe("connectHarness face scenarios", () => {
  it("runs every fake scenario green", () => {
    const r = runAllFaceScenarios();
    expect(r.failed, JSON.stringify(r.failed)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.passed).toBe(CONNECT_FACE_SCENARIOS.length);
  });

  it("maps Method_Cancel via payload helper", () => {
    const h = fakeConnectFailureHuman("Method_Cancel", "Cancelled");
    expect(h.toLowerCase()).toContain("cancelled");
  });

  it("labels fake mode honestly", () => {
    expect(harnessBanner("fake")).toMatch(/not a hardware proof/i);
    expect(harnessBanner("device")).toMatch(/Suite/i);
  });

  it("device checklist forbids soft-seed costume", () => {
    expect(
      CONNECT_DEVICE_CHECKLIST.some((l) => /Kill_if.*software HD/i.test(l)),
    ).toBe(true);
  });

  it("single scenario detail is readable on fail", () => {
    const bad = runFaceScenario({
      ...CONNECT_FACE_SCENARIOS[0],
      expectCurrent: "ready",
    });
    expect(bad.ok).toBe(false);
    expect(bad.detail).toMatch(/expected ready/);
  });
});
