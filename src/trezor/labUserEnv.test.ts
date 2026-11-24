import { describe, expect, it } from "vitest";
import { LAB_USER_ENV_CHECKLIST, statusRunning } from "./labUserEnv";

describe("labUserEnv", () => {
  it("checklist keeps don’t-pretend law", () => {
    const blob = LAB_USER_ENV_CHECKLIST.join(" ");
    expect(blob).toMatch(/Connect/i);
    expect(blob).toMatch(/Suite/i);
    expect(blob).toMatch(/soft-seed|Kill_if/i);
  });

  it("parses controller status objects", () => {
    expect(statusRunning(true)).toBe(true);
    expect(statusRunning({ is_running: true, version: "2-main" })).toBe(true);
    expect(statusRunning({ is_running: false })).toBe(false);
  });
});
