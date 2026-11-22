import { describe, expect, it } from "vitest";
import { humanTrezorError } from "./errors";

describe("humanTrezorError", () => {
  it("maps bridge missing", () => {
    expect(humanTrezorError("Bridge not running on 21325")).toMatch(/Bridge/i);
  });

  it("maps user cancel", () => {
    expect(humanTrezorError("Cancelled by user")).toMatch(/Cancelled/i);
  });

  it("maps popup closed", () => {
    expect(humanTrezorError("Popup closed by user")).toMatch(/closed/i);
  });

  it("passes through unknown", () => {
    expect(humanTrezorError("weird xyz")).toBe("weird xyz");
  });
});
