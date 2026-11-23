import { describe, expect, it } from "vitest";
import { getFocusable, trapTabKey } from "./focusTrap";

describe("focusTrap", () => {
  it("exports helpers", () => {
    expect(typeof getFocusable).toBe("function");
    expect(typeof trapTabKey).toBe("function");
  });

  it("does nothing on non-Tab", () => {
    let prevented = false;
    trapTabKey(
      {
        key: "a",
        preventDefault: () => {
          prevented = true;
        },
      } as unknown as KeyboardEvent,
      { querySelectorAll: () => [] } as unknown as HTMLElement,
    );
    expect(prevented).toBe(false);
  });
});
