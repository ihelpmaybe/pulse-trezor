import { describe, expect, it } from "vitest";
import { ACCOUNT_GAP_SPARE } from "./accountGap";

describe("account gap constants", () => {
  it("keeps a small spare after last used", () => {
    expect(ACCOUNT_GAP_SPARE).toBe(1);
  });
});
