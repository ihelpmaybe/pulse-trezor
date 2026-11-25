import { describe, expect, it } from "vitest";
import { en, t } from "./en";

describe("en locale map", () => {
  it("has first-run and Suite Allow keys", () => {
    expect(t("firstRunTitle")).toBeTruthy();
    expect(t("suiteAllowTitle")).toMatch(/Suite/i);
    expect(Object.keys(en).length).toBeGreaterThan(15);
  });
});
