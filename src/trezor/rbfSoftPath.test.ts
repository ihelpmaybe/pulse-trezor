import { describe, expect, it } from "vitest";
import { rbfPendingHint, rbfSoftCoach } from "./rbfSoftPath";

describe("rbf soft path", () => {
  it("coaches device-proven Speed up / Cancel without Anvil theater", () => {
    expect(rbfSoftCoach()).toMatch(/Speed up/i);
    expect(rbfSoftCoach()).toMatch(/Cancel/i);
    expect(rbfSoftCoach()).not.toMatch(/still OPEN/i);
    expect(rbfPendingHint()).toMatch(/Speed up/i);
    expect(rbfPendingHint()).toMatch(/Cancel/i);
  });
});
