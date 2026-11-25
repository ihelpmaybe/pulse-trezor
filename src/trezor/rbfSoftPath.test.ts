import { describe, expect, it } from "vitest";
import { rbfPendingHint, rbfSoftCoach } from "./rbfSoftPath";

describe("rbf soft path", () => {
  it("does not claim device mempool proof", () => {
    expect(rbfSoftCoach()).toMatch(/OPEN/i);
    expect(rbfSoftCoach()).toMatch(/Anvil/i);
    expect(rbfPendingHint()).toMatch(/Anvil proof/i);
  });
});
